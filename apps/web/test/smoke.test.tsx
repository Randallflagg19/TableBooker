import { render, screen } from '@testing-library/react';

function SmokeComponent() {
  return <div>Frontend test setup works</div>;
}

describe('frontend test setup', () => {
  it('renders a basic component', () => {
    render(<SmokeComponent />);

    expect(screen.getByText('Frontend test setup works')).toBeInTheDocument();
  });
});
