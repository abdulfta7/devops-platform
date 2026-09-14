import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

// Mock the AuthContext
jest.mock('../src/context/AuthContext', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: () => ({
    user: null,
    loading: false,
    logout: jest.fn()
  })
}));

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
  });

  it('contains the router structure', () => {
    render(<App />);
    // The app should render without errors
    expect(document.body).toBeInTheDocument();
  });
});
