import { render, screen } from '@testing-library/react';
import App from './App';

test('renders loading text on splash screen', () => {
  render(<App />);
  const loadingElement = screen.getByText(/Đang tải dữ liệu/i);
  expect(loadingElement).toBeInTheDocument();
});
