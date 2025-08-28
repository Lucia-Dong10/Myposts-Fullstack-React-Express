// Profile.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from './Profile';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { useNavigate } from 'react-router-dom';

// Mock useNavigate from react-router-dom
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate, // Return the mocked navigate function
}));

describe('Profile Page Tests', () => {
    const mockNavigate = useNavigate();

    beforeEach(() => {
        // Mock local storage data
        localStorage.setItem('loggedInUserId', '11');
        localStorage.setItem('isRegisteredUser', 'true');
        localStorage.setItem('loggedInUsername', 'testuser');
        localStorage.setItem('loggedInDisplayName', 'Test User');
        localStorage.setItem('loggedInEmail', 'testuser@example.com');
        localStorage.setItem('loggedInPhone', '123-456-7890');
        localStorage.setItem('loggedInZipcode', '12345');
        localStorage.setItem('loggedInPassword', 'password123');
        mockNavigate.mockClear();
    });

    afterEach(() => {
        // Clear local storage
        localStorage.clear();
    });

    it('should fetch the logged-in user\'s profile username', async () => {
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Username:')).toBeInTheDocument();
            expect(screen.getByText('testuser')).toBeInTheDocument();
        });
    });

    it('should display validation errors for invalid email and phone', async () => {
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('New email'), { target: { value: 'invalid-email' } });
        fireEvent.change(screen.getByPlaceholderText('New phone'), { target: { value: 'invalid-phone' } });
        fireEvent.click(screen.getByText('Update'));

        expect(await screen.findByText('Invalid email format')).toBeInTheDocument();
        expect(screen.getByText('Phone number must be in xxx-xxx-xxxx format')).toBeInTheDocument();
    });

    it('should update profile fields and show success message', async () => {
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('New display name'), { target: { value: 'Updated User' } });
        fireEvent.change(screen.getByPlaceholderText('New email'), { target: { value: 'newemail@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('New phone'), { target: { value: '987-654-3210' } });
        fireEvent.change(screen.getByPlaceholderText('New zipcode'), { target: { value: '54321' } });
        fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'newpassword' } });
        fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'newpassword' } });
        fireEvent.click(screen.getByText('Update'));

        await waitFor(() => expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument());

        expect(localStorage.getItem('loggedInDisplayName')).toBe('Updated User');
        expect(localStorage.getItem('loggedInEmail')).toBe('newemail@example.com');
        expect(localStorage.getItem('loggedInPhone')).toBe('987-654-3210');
        expect(localStorage.getItem('loggedInZipcode')).toBe('54321');
    });

    it('should reset form fields', async () => {
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('New display name'), { target: { value: 'Updated User' } });
        fireEvent.change(screen.getByPlaceholderText('New email'), { target: { value: 'newemail@example.com' } });
        fireEvent.click(screen.getByText('Reset'));

        expect(screen.getByPlaceholderText('New display name')).toHaveValue('');
        expect(screen.getByPlaceholderText('New email')).toHaveValue('');
    });

    it('should handle avatar upload and update', async () => {
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        const fileInput = screen.getByTestId('file-upload');
        const testImageFile = new File(['dummy content'], 'avatar.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [testImageFile] } });

        fireEvent.click(screen.getByText('Upload Profile Picture'));
        await waitFor(() => {
            expect(screen.getByAltText('Profile').src).toContain('data:image/png;base64');
        });
    });

    it('should navigate back to the main page on Back to Main Page button click', () => {
        const { getByText } = render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        fireEvent.click(getByText('Back to Main Page'));
        expect(mockNavigate).toHaveBeenCalledWith('/main');
    });

    it('should show error for mismatched passwords', async () => {
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'newpassword' } });
        fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'differentpassword' } });
        fireEvent.click(screen.getByText('Update'));

        await waitFor(() => {
            expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
        });
    });

    it('should show error if new password is the same as the old password', async () => {
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'password123' } });
        fireEvent.click(screen.getByText('Update'));

        await waitFor(() => {
            expect(screen.getByText('New password cannot be the same as the old password')).toBeInTheDocument();
        });
    });

    it('should redirect to home if no logged-in user', () => {
        localStorage.clear();
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should display validation error for short password', async () => {
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: '123' } });
        fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: '123' } });
        fireEvent.click(screen.getByText('Update'));

        expect(await screen.findByText('Password must be at least 6 characters long')).toBeInTheDocument();
    });

    it('should display error if trying to upload avatar without selecting a file', async () => {
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        // Mock alert function
        const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

        // Click the "Upload Profile Picture" button without selecting a file
        fireEvent.click(screen.getByText('Upload Profile Picture'));

        // Check if alert was called with the expected message
        expect(alertMock).toHaveBeenCalledWith('Please upload a picture first.');

        // Clean up the mock
        alertMock.mockRestore();
    });

    it('should update only the email field', async () => {
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('New email'), { target: { value: 'updatedemail@example.com' } });
        fireEvent.click(screen.getByText('Update'));

        await waitFor(() => expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument());
        expect(localStorage.getItem('loggedInEmail')).toBe('updatedemail@example.com');
    });

    it('should clear temporary avatar data when navigating back to main page', async () => {
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        // Simulate avatar upload
        const fileInput = screen.getByTestId('file-upload');
        const testImageFile = new File(['dummy content'], 'avatar.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [testImageFile] } });
        fireEvent.click(screen.getByText('Back to Main Page'));

        expect(mockNavigate).toHaveBeenCalledWith('/main');
        expect(localStorage.getItem('loggedInAvatar')).toBe(null); // Ensure avatar is not stored if not confirmed
    });

    it('should display an error message if no input is provided on update', async () => {
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        // Click "Update" button without entering any data
        fireEvent.click(screen.getByText('Update'));

        // Check if "No information input" message is displayed
        await waitFor(() => {
            expect(screen.getByText('No information input!')).toBeInTheDocument();
        });
    });

    it('should clear success message after updating profile', async () => {
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        // Enter new email and update
        fireEvent.change(screen.getByPlaceholderText('New email'), { target: { value: 'newemail@example.com' } });
        fireEvent.click(screen.getByText('Update'));

        // Check success message
        await waitFor(() => expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument());

        // Clear input and update
        fireEvent.change(screen.getByPlaceholderText('New email'), { target: { value: '' } });
        fireEvent.click(screen.getByText('Update'));

        // Success message should disappear
        await waitFor(
            () => expect(screen.queryByText('Profile updated successfully!')).not.toBeInTheDocument(),
            { timeout: 4000 }  // Set wait time to ensure timer clears success message
        );
    });

    it('should clear temporary avatar data when navigating back without uploading', () => {
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        // Navigate back to main page without uploading any file
        fireEvent.click(screen.getByText('Back to Main Page'));

        expect(mockNavigate).toHaveBeenCalledWith('/main');
        expect(localStorage.getItem('loggedInAvatar')).toBe(null); // Ensure no avatar data is saved
    });

    it('should load JSON Placeholder user data if not a registered user', async () => {
        // Mock non-registered user
        localStorage.setItem('loggedInUserId', '5'); // Assume id 5 is a JSON Placeholder user
        localStorage.removeItem('isRegisteredUser'); // Non-registered status

        render(<MemoryRouter><Profile /></MemoryRouter>);

        await waitFor(() => {
            // Verify JSON Placeholder user info loads correctly
            expect(screen.getByText('Username:')).toBeInTheDocument();
        });
    });

    it('should load user information from JSON Placeholder if not a registered user', async () => {
        // Clear localStorage and set up conditions to trigger JSON Placeholder fetch
        localStorage.setItem('loggedInUserId', '1');
        localStorage.setItem('isRegisteredUser', 'false');

        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        await waitFor(() => {
            // Validate that data from mocked fetch is displayed
            expect(screen.getByText('Username:')).toBeInTheDocument();
            expect(screen.getByText('Bret')).toBeInTheDocument();
            expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
            expect(screen.getByText('Sincere@april.biz')).toBeInTheDocument();
        });
    });

});
