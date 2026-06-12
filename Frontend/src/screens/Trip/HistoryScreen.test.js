import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HistoryScreen from './HistoryScreen';
import { getTripHistory } from '../../services/tripService';
import { storageGet } from '../../platform/storage';

jest.mock('../../services/tripService', () => ({
    getTripHistory: jest.fn(),
}));

jest.mock('../../platform/storage', () => ({
    storageGet: jest.fn(),
}));

describe('HistoryScreen date filter', () => {
    beforeEach(() => {
        storageGet.mockResolvedValue('token');
        getTripHistory.mockResolvedValue([
            {
                itinerary_id: 'valid-trip',
                name: 'Hành trình hợp lệ',
                status: 'COMPLETED',
                create_at: '2026-06-11T08:00:00',
                total_budget: 100000,
            },
            {
                itinerary_id: 'invalid-trip',
                name: 'Hành trình sai ngày',
                status: 'CANCELLED',
                create_at: 'not-a-date',
                total_budget: 50000,
            },
        ]);
    });

    test('does not crash when filtering history containing an invalid date', async () => {
        render(<HistoryScreen onBack={jest.fn()} />);

        await screen.findByText('Hành trình hợp lệ');

        fireEvent.change(screen.getByLabelText('Chọn ngày'), {
            target: { value: '2026-06-11' },
        });

        await waitFor(() => {
            expect(screen.getByText('Hành trình hợp lệ')).toBeInTheDocument();
            expect(screen.queryByText('Hành trình sai ngày')).not.toBeInTheDocument();
        });
    });
});
