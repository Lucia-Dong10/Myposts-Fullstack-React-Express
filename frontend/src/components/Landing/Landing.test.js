import { render, fireEvent, screen, waitFor, act } from '@testing-library/react';
import {MemoryRouter, Routes, Route, useNavigate} from 'react-router-dom';
import Landing from './Landing';
import '@testing-library/jest-dom';
import Main from "../Main/Main";

window.alert = jest.fn();

// Mock Main Component with Log Out button
function MockMain() {
    return (
        <div>
            <button onClick={() => localStorage.removeItem('loggedInUserId')}>Log Out</button>
        </div>
    );
}

// Mock localStorage
const setItemMock = jest.spyOn(Storage.prototype, 'setItem');
const removeItemMock = jest.spyOn(Storage.prototype, 'removeItem');
// Mock useNavigate from react-router-dom
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate, // Return the mocked navigate function
}));

describe('Landing Page Authentication Tests', () => {
    const mockNavigate = useNavigate();
    beforeEach( async () => {
        // Reset mocks and add a mock registered user
        jest.clearAllMocks();
        jest.spyOn(Storage.prototype, 'setItem');
        jest.spyOn(Storage.prototype, 'getItem');
        localStorage.clear();

        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve([
                    {
                        id: 1,
                        username: 'Bret',
                        name: 'Leanne Graham',
                        address: { street: 'Kulas Light' }
                    }
                ])
            })
        );
    });

    afterEach(() => {
        // Clear local storage
        localStorage.clear();
        jest.clearAllMocks();
    });


    it('should log in a previously registered user', () => {
        localStorage.setItem('loggedInUserId', '11');
        localStorage.setItem('loggedInUsername', 'validUser');
        localStorage.setItem('loggedInDisplayName', 'Valid User');
        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/main" element={<MockMain />} />
                </Routes>
            </MemoryRouter>
        );

        // Simulate entering valid credentials
        fireEvent.change(screen.getByPlaceholderText('Your user name'), { target: { value: 'validUser' } });
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'validPassword' } });
        fireEvent.click(screen.getByText('Login'));

        // Check if login state was set in localStorage
        expect(setItemMock).toHaveBeenCalledWith('loggedInUserId', '11');
        expect(setItemMock).toHaveBeenCalledWith('loggedInDisplayName', 'Valid User');
    });

    it('should not log in an invalid user', () => {
        localStorage.setItem('loggedInUserId', '11');
        localStorage.setItem('loggedInUsername', 'validUser');
        localStorage.setItem('loggedInDisplayName', 'Valid User');
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );

        // Simulate invalid credentials
        fireEvent.change(screen.getByPlaceholderText('Your user name'), { target: { value: 'invalidUser' } });
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'invalidPassword' } });
        fireEvent.click(screen.getByText('Login'));

        // Check for error message
        expect(screen.getByText('Invalid account name or password.')).toBeInTheDocument();
    });

    it('should log out a user', () => {
        localStorage.setItem('loggedInUserId', '11');
        localStorage.setItem('loggedInUsername', 'validUser');
        localStorage.setItem('loggedInDisplayName', 'Valid User');
        render(
            <MemoryRouter initialEntries={['/main']}>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/main" element={<MockMain />} />
                </Routes>
            </MemoryRouter>
        );

        // Simulate clicking the "Log Out" button on the Main page
        fireEvent.click(screen.getByText('Log Out'));

        // Check if login state was cleared
        expect(removeItemMock).toHaveBeenCalledWith('loggedInUserId');
    });

    it('should display error if username is not unique', async () => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );

        // Wait for users to load in component
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        // Ensure fetch was successful and registeredUsers has loaded
        await waitFor(() => {
            expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        });

        // Enter an existing username to trigger the validation
        fireEvent.change(screen.getByPlaceholderText('Enter your real name'), { target: { value: 'Bret' } });
        fireEvent.click(screen.getByRole('button', { name: 'Register' }));

        // Wait and then check for the error message
        expect(screen.getByText('Username already exists')).toBeInTheDocument();

    });

    it('should display error for invalid email format', () => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );

        // Enter invalid email format
        fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'invalid-email' } });
        fireEvent.click(screen.getByRole('button', { name: 'Register' }));

        // Check for email format error message
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });

    it('should display error for invalid phone number format', () => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );

        // Enter invalid phone format
        fireEvent.change(screen.getByPlaceholderText('123-123-1234'), { target: { value: '123456789' } });
        fireEvent.click(screen.getByRole('button', { name: 'Register' }));

        // Check for phone format error message
        expect(screen.getByText('Phone number must be in xxx-xxx-xxxx format')).toBeInTheDocument();
    });

    it('should display error for invalid zipcode format', () => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );

        // Enter invalid zipcode format
        fireEvent.change(screen.getByPlaceholderText('Enter zipcode'), { target: { value: '123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Register' }));

        // Check for zipcode format error message
        expect(screen.getByText('Zipcode must be 5 digits')).toBeInTheDocument();
    });

    it('should display error if user is under 18 years old', async () => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );

        // Input a birthdate that does not meet the age requirement (e.g., today minus 17 years, indicating under 18)
        const underageDate = new Date();
        underageDate.setFullYear(underageDate.getFullYear() - 17);
        const formattedUnderageDate = underageDate.toISOString().split('T')[0];

        // Find the birthday input field using getByLabelText
        fireEvent.change(screen.getByLabelText('Birthday'), { target: { value: formattedUnderageDate } });

        // Submit the registration form
        fireEvent.click(screen.getByRole('button', { name: 'Register' }));

        // Check if age validation error message is displayed
        await waitFor(() => {
            expect(screen.getByText('You must be at least 18 years old to register')).toBeInTheDocument();
        });
    });

    it('should display error if passwords do not match', () => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'differentPassword' } });

        // Click the register button to trigger validation
        fireEvent.click(screen.getByRole('button', { name: 'Register' }));

        // Check for the error message indicating mismatched passwords
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    it('should save registered user info in localStorage and display success message on registration', async () => {
        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                store: {},
                getItem(key) {
                    return this.store[key] || null;
                },
                setItem(key, value) {
                    this.store[key] = value.toString();
                },
                clear() {
                    this.store = {};
                }
            },
            writable: true
        });

        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );

        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

        // Input valid registration details
        fireEvent.change(screen.getByPlaceholderText('Enter your real name'), { target: { value: 'NewUser' } });
        fireEvent.change(screen.getByPlaceholderText('Enter display name'), { target: { value: 'Display Name' } });
        fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'newuser@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('123-123-1234'), { target: { value: '123-456-7890' } });
        fireEvent.change(screen.getByPlaceholderText('Enter zipcode'), { target: { value: '12345' } });
        fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText('Birthday'), { target: { value: '2000-01-01' } });

        // Submit the registration form
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Register' }));
            // Verify `localStorage` data matches
        });

        await waitFor(() => {
            expect(localStorage.getItem('loggedInUsername')).toBe('NewUser');
            expect(localStorage.getItem('loggedInDisplayName')).toBe('Display Name');
            expect(localStorage.getItem('loggedInEmail')).toBe('newuser@example.com');
            expect(localStorage.getItem('loggedInPhone')).toBe('123-456-7890');
            expect(localStorage.getItem('loggedInZipcode')).toBe('12345');
            expect(localStorage.getItem('loggedInPassword')).toBe('password123');
            expect(localStorage.getItem('isRegisteredUser')).toBe('true');
        });
    });

  it('should show an error with incorrect credentials', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    // Enter incorrect username and password
    fireEvent.change(screen.getByPlaceholderText('Your user name'), { target: { value: 'wronguser' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrongpassword' } });

    // Click login button
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    // Verify error message is displayed
    expect(screen.getByText('Invalid account name or password.')).toBeInTheDocument();
  });

    it('should log in successfully with correct credentials', async () => {
    // Set up a registered user directly in the component's state
        render(
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/main" element={<Main />} />
            </Routes>
          </MemoryRouter>
        );

        // Register a user first
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

        // Simulate entering correct username and password
        fireEvent.change(screen.getByPlaceholderText('Enter your real name'), { target: { value: 'NewUser' } });
        fireEvent.change(screen.getByPlaceholderText('Enter display name'), { target: { value: 'Display Name' } });
        fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'newuser@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('123-123-1234'), { target: { value: '123-456-7890' } });
        fireEvent.change(screen.getByPlaceholderText('Enter zipcode'), { target: { value: '12345' } });
        fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText('Birthday'), { target: { value: '2000-01-01' } });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Register' }));
        });

        // Log out the current user (if any) for a clean login test
        localStorage.clear();

        // Log in with the newly registered user
        fireEvent.change(screen.getByPlaceholderText('Your user name'), { target: { value: 'NewUser' } });
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
        // Click login button
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Login' }));
        });

        // Verify navigation to main page was triggered
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/main'));

        // Verify localStorage settings
        expect(localStorage.getItem('loggedInUserId')).toBe('2');
        expect(localStorage.getItem('loggedInDisplayName')).toBe('Display Name');
    });

});
