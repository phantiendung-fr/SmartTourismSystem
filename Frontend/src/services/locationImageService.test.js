jest.mock('../config/api', () => ({
    API_BASE: 'https://api.test',
}));

const { getLocationFallbackImages } = require('./locationImageService');

const locationId = 'cc559fd6-178e-48d4-bf2a-2b4f9a97dff1';

const jsonResponse = (body, ok = true) => Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
});

describe('location image fallback', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    test('uses database images without requesting external images', async () => {
        global.fetch.mockImplementation(() => jsonResponse([
            { url: 'https://example.com/database.jpg', display_order: 1 },
        ]));

        const images = await getLocationFallbackImages(locationId);

        expect(images).toEqual([
            expect.objectContaining({
                url: 'https://example.com/database.jpg',
                source: 'database',
            }),
        ]);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('uses eligible Wikimedia images when the database has no images', async () => {
        global.fetch
            .mockImplementationOnce(() => jsonResponse([]))
            .mockImplementationOnce(() => jsonResponse({
                eligible: true,
                images: [{
                    url: 'https://upload.wikimedia.org/ben-thanh.jpg',
                    source_url: 'https://commons.wikimedia.org/wiki/File:Ben_Thanh_Market.jpg',
                    author: 'Example Author',
                    license: 'CC BY-SA 4.0',
                }],
            }));

        const images = await getLocationFallbackImages(locationId);

        expect(images).toEqual([
            expect.objectContaining({
                url: 'https://upload.wikimedia.org/ben-thanh.jpg',
                source: 'external',
            }),
        ]);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('returns an empty list when external images are not eligible', async () => {
        global.fetch
            .mockImplementationOnce(() => jsonResponse([]))
            .mockImplementationOnce(() => jsonResponse({
                eligible: false,
                reason: 'unsupported_location_category',
                images: [],
            }));

        await expect(getLocationFallbackImages(locationId)).resolves.toEqual([]);
    });
});
