import os
import shutil
from PIL import Image, ImageDraw

def generate_icons():
    # Source path is the uploaded background-removed icon
    source_path = r"d:\Workspace\js\AppDuLich\icon-removedBg.jpg"
    res_path = r"d:\Workspace\js\AppDuLich\SmartTourismSystem\Frontend\android\app\src\main\res"
    frontend_assets_logo = r"d:\Workspace\js\AppDuLich\SmartTourismSystem\Frontend\assets\logo.png"
    output_icon_jpg = r"d:\Workspace\js\AppDuLich\icon.jpg"

    if not os.path.exists(source_path):
        print(f"Error: Source image not found at {source_path}")
        return

    # Load source image (we know it's a PNG with RGBA mode)
    img = Image.open(source_path).convert("RGBA")

    # Save to Frontend/assets/logo.png
    os.makedirs(os.path.dirname(frontend_assets_logo), exist_ok=True)
    img.save(frontend_assets_logo, "PNG")
    print(f"Copied source to frontend assets: {frontend_assets_logo}")

    # Generate output icon.jpg with white background (JPEG)
    bg_jpg = Image.new("RGB", img.size, (255, 255, 255))
    bg_jpg.paste(img, (0, 0), mask=img)
    bg_jpg.save(output_icon_jpg, "JPEG", quality=95)
    print(f"Saved custom icon.jpg to: {output_icon_jpg}")

    # Mipmap densities and sizes
    # (density, legacy_size, adaptive_size)
    configs = [
        ("mdpi", 48, 108),
        ("hdpi", 72, 162),
        ("xhdpi", 96, 216),
        ("xxhdpi", 144, 324),
        ("xxxhdpi", 192, 432)
    ]

    for density, legacy_size, adaptive_size in configs:
        density_dir = os.path.join(res_path, f"mipmap-{density}")
        os.makedirs(density_dir, exist_ok=True)

        # 1. Generate ic_launcher.png (Legacy square icon on white background)
        legacy_bg = Image.new("RGBA", (legacy_size, legacy_size), (255, 255, 255, 255))
        logo_legacy_size = int(legacy_size * 0.85)
        logo_legacy_resized = img.resize((logo_legacy_size, logo_legacy_size), Image.Resampling.LANCZOS)
        offset_legacy = (legacy_size - logo_legacy_size) // 2
        legacy_bg.paste(logo_legacy_resized, (offset_legacy, offset_legacy), mask=logo_legacy_resized)
        
        legacy_path = os.path.join(density_dir, "ic_launcher.png")
        legacy_bg.save(legacy_path, "PNG")
        print(f"Generated {legacy_path} ({legacy_size}x{legacy_size})")

        # 2. Generate ic_launcher_round.png (Circular white background with centered logo)
        round_bg = Image.new("RGBA", (legacy_size, legacy_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(round_bg)
        draw.ellipse((0, 0, legacy_size - 1, legacy_size - 1), fill=(255, 255, 255, 255))
        round_bg.paste(logo_legacy_resized, (offset_legacy, offset_legacy), mask=logo_legacy_resized)
        
        round_path = os.path.join(density_dir, "ic_launcher_round.png")
        round_bg.save(round_path, "PNG")
        print(f"Generated {round_path} ({legacy_size}x{legacy_size})")

        # 3. Generate ic_launcher_foreground.png (Adaptive foreground - transparent logo centered)
        foreground_logo_size = int(adaptive_size * 0.68)
        logo_adaptive_resized = img.resize((foreground_logo_size, foreground_logo_size), Image.Resampling.LANCZOS)
        
        adaptive_fg = Image.new("RGBA", (adaptive_size, adaptive_size), (0, 0, 0, 0))
        offset_adaptive = (adaptive_size - foreground_logo_size) // 2
        adaptive_fg.paste(logo_adaptive_resized, (offset_adaptive, offset_adaptive), mask=logo_adaptive_resized)
        
        foreground_path = os.path.join(density_dir, "ic_launcher_foreground.png")
        adaptive_fg.save(foreground_path, "PNG")
        print(f"Generated {foreground_path} ({adaptive_size}x{adaptive_size})")

    print("\nAll background-removed icons generated successfully!")

if __name__ == "__main__":
    generate_icons()
