import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../src/components/Navbar';

// Mock the AuthContext
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    logout: jest.fn()
  })
}));

describe('Navbar Component', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
  });

  it('displays the logo', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    expect(screen.getByText('DevOps Academy')).toBeInTheDocument();
  });

  it('displays navigation links', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Tracks')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
  });
});
