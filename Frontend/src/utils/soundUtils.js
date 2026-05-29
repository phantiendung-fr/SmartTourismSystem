import { App } from '@capacitor/app';

class SoundManager {
    constructor() {
        this.bgmStarted = false;
        this._systemPaused = false;
        
        // Khôi phục cài đặt từ localStorage
        const savedBgm = localStorage.getItem('bgmEnabled');
        this.bgmEnabled = savedBgm !== null ? savedBgm === 'true' : true;
        
        const savedSfx = localStorage.getItem('sfxEnabled');
        this.sfxEnabled = savedSfx !== null ? savedSfx === 'true' : true;
        
        const savedVolume = localStorage.getItem('bgmVolume');
        this.bgmVolume = savedVolume !== null ? parseFloat(savedVolume) : 0.5;

        // Khởi tạo Web Audio API Context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
        
        // Gain Node cho BGM để chỉnh âm lượng
        this.bgmGainNode = this.audioCtx.createGain();
        this.bgmGainNode.gain.value = this.bgmVolume;
        this.bgmGainNode.connect(this.audioCtx.destination);
        
        this.bgmBuffer = null;
        this.bgmSource = null;
        this.sfxBuffers = {}; // Cache cho các file SFX
        
        this.loadBGM();
        this.setupAppLifecycle();
    }

    setupAppLifecycle() {
        // Lắng nghe sự kiện web tab bị ẩn
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handleAppBackground();
            } else {
                this.handleAppForeground();
            }
        });

        // Lắng nghe sự kiện Capacitor App khi chuyển background/foreground trên mobile
        try {
            App.addListener('appStateChange', ({ isActive }) => {
                if (isActive) {
                    this.handleAppForeground();
                } else {
                    this.handleAppBackground();
                }
            });
        } catch (e) {
            console.warn('Capacitor App plugin not fully loaded', e);
        }
    }

    handleAppBackground() {
        if (this.bgmStarted && this.bgmSource && this.bgmEnabled) {
            this._systemPaused = true;
            this.pauseBGM();
        }
    }

    handleAppForeground() {
        if (this._systemPaused) {
            this._systemPaused = false;
            if (this.bgmEnabled) {
                this.playBGM();
            }
        }
    }

    // Tải trước file BGM và giải mã
    async loadBGM() {
        try {
            const response = await fetch('/assets/sounds/bgm.mp3'); 
            if (!response.ok) throw new Error('File bgm.mp3 không tồn tại');
            const arrayBuffer = await response.arrayBuffer();
            this.bgmBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
            
            // Nếu đã có lệnh play trước khi tải xong thì tự động phát
            if (this.bgmEnabled && this.bgmStarted) {
                this.playBGM();
            }
        } catch (err) {
            console.warn('Không thể tải BGM:', err);
        }
    }

    setBgmEnabled(enabled) {
        this.bgmEnabled = enabled;
        localStorage.setItem('bgmEnabled', enabled);
        
        if (enabled) {
            this.playBGM();
        } else {
            this.pauseBGM();
        }
    }

    setSfxEnabled(enabled) {
        this.sfxEnabled = enabled;
        localStorage.setItem('sfxEnabled', enabled);
    }

    isBgmEnabled() {
        return this.bgmEnabled;
    }

    isSfxEnabled() {
        return this.sfxEnabled;
    }
    
    getBgmVolume() {
        return this.bgmVolume;
    }

    setBgmVolume(volume) {
        this.bgmVolume = volume;
        localStorage.setItem('bgmVolume', volume);
        if (this.bgmGainNode) {
            this.bgmGainNode.gain.value = volume;
        }
    }

    playBGM() {
        if (!this.bgmEnabled) return;
        this.bgmStarted = true;
        
        // Đảm bảo AudioContext đang hoạt động (do trình duyệt thường block cho đến khi user click)
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        
        if (!this.bgmBuffer) return; // Đang tải...
        
        // Dừng BGM cũ nếu có
        this.pauseBGM();
        
        // Tạo Source mới để phát
        this.bgmSource = this.audioCtx.createBufferSource();
        this.bgmSource.buffer = this.bgmBuffer;
        this.bgmSource.loop = true;
        this.bgmSource.connect(this.bgmGainNode);
        
        try {
            this.bgmSource.start(0);
        } catch (e) {
            console.warn('BGM không thể tự động phát, cần tương tác trước', e);
        }
    }

    pauseBGM() {
        if (this.bgmSource) {
            try {
                this.bgmSource.stop();
                this.bgmSource.disconnect();
            } catch(e) {}
            this.bgmSource = null;
        }
    }

    async loadSFX(soundFileName) {
        if (this.sfxBuffers[soundFileName]) return this.sfxBuffers[soundFileName];
        try {
            const response = await fetch(`/assets/sounds/${soundFileName}`);
            if (!response.ok) throw new Error(`File ${soundFileName} không tồn tại`);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await this.audioCtx.decodeAudioData(arrayBuffer);
            this.sfxBuffers[soundFileName] = buffer;
            return buffer;
        } catch (err) {
            console.warn(`Lỗi tải SFX ${soundFileName}:`, err);
            return null;
        }
    }

    async playSound(soundFileName) {
        if (!this.sfxEnabled) return;
        
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        
        try {
            let buffer = this.sfxBuffers[soundFileName];
            if (!buffer) {
                // Tải nóng nếu chưa cache (có thể hơi trễ lần đầu)
                buffer = await this.loadSFX(soundFileName);
            }
            if (!buffer) return;
            
            const source = this.audioCtx.createBufferSource();
            source.buffer = buffer;
            
            // SFX không cần chỉnh âm lượng, nối thẳng ra loa
            source.connect(this.audioCtx.destination);
            source.start(0);
        } catch (err) {
            console.warn('Lỗi phát âm thanh:', err);
        }
    }
}

const soundManager = new SoundManager();

export const setBgmEnabled = (val) => soundManager.setBgmEnabled(val);
export const setSfxEnabled = (val) => soundManager.setSfxEnabled(val);
export const isBgmEnabled = () => soundManager.isBgmEnabled();
export const isSfxEnabled = () => soundManager.isSfxEnabled();
export const getBgmVolume = () => soundManager.getBgmVolume();
export const setBgmVolume = (val) => soundManager.setBgmVolume(val);
export const playBGM = () => soundManager.playBGM();
export const pauseBGM = () => soundManager.pauseBGM();
export const playSound = (name) => soundManager.playSound(name);

