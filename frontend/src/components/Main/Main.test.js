import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Main from './Main';
import Posts from './Posts';
import {MemoryRouter, useNavigate} from 'react-router-dom';

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'test-url');

// Mock JSON Placeholder API data
const mockArticles = [
  { id: 1, title: 'First Article', body: 'This is the first article', author: 'User1', timestamp: new Date().toISOString() },
  { id: 2, title: 'Second Article', body: 'This is the second article', author: 'User2', timestamp: new Date().toISOString() }
];
const mockFollowerArticles = [
  { id: 3, title: 'Follower Article', body: 'Article by new follower', author: 'User3', timestamp: new Date().toISOString() }
];
// Mock useNavigate from react-router-dom
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate, // Return the mocked navigate function
}));

// Setup function to render Main component with MemoryRouter
const renderMain = () => render(<Main />, { wrapper: MemoryRouter });

describe('Main Component', () => {
  const mockNavigate = useNavigate();
  beforeEach(() => {
    // Mock localStorage data for logged-in user and articles
    localStorage.setItem('loggedInUserId', '1');
    localStorage.setItem('loggedInUsername', 'User1');
    localStorage.setItem('isRegisteredUser', 'true');
    localStorage.setItem('loggedInDisplayName', 'User One');
    localStorage.setItem('articles', JSON.stringify(mockArticles));
    renderMain();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should retrieve all articles of the currently logged-in user', async () => {
    // Wait for loading to complete
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

    // Ensure articles load correctly
    expect(screen.getByText('First Article')).toBeInTheDocument();
    expect(screen.getByText('Second Article')).toBeInTheDocument();
  });

  it('should filter displayed articles based on search keyword', async () => {
    // Wait for the page to load
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText('Search posts here...');
    fireEvent.change(searchInput, { target: { value: 'First' } });

    // Ensure only "First Article" is visible after filtering
    expect(screen.getByText('First Article')).toBeInTheDocument();
    expect(screen.queryByText('Second Article')).not.toBeInTheDocument();
  });

  it('should increase the total number of articles when adding a follower', async () => {
    // Wait for the page to load
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

    const initialArticleCount = screen.getAllByRole('heading', { level: 3 }).length;

    // Simulate adding a follower
    fireEvent.change(screen.getByPlaceholderText('Enter display name or username'), { target: { value: 'User3' } });
    fireEvent.click(screen.getByText('Add'));

    // Confirm the total number of articles has increased
    await waitFor(() => {
      const updatedArticleCount = screen.getAllByRole('heading', { level: 3 }).length;
      expect(updatedArticleCount).toBeGreaterThan(initialArticleCount);
    });
  });

  it('should decrease the total number of articles when removing a follower', async () => {
    // Wait for the page to load
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

    const initialArticleCount = screen.getAllByRole('heading', { level: 3 }).length;

    // Simulate adding a follower
    fireEvent.change(screen.getByPlaceholderText('Enter display name or username'), { target: { value: 'User3' } });
    fireEvent.click(screen.getByText('Add'));

    // Confirm the total number of articles has increased
    await waitFor(() => {
      const updatedArticleCount = screen.getAllByRole('heading', { level: 3 }).length;
      expect(updatedArticleCount).toBeGreaterThan(initialArticleCount);
    });
    const articleCountAfterAdd = screen.getAllByRole('heading', { level: 3 }).length;

    // Simulate removing a follower
    fireEvent.click(screen.getAllByText('Unfollow')[0]);

    // Confirm the total number of articles has decreased
    await waitFor(() => {
      const articleCountAfterRemove = screen.getAllByRole('heading', { level: 3 }).length;
      expect(articleCountAfterRemove).toBeLessThan(articleCountAfterAdd);
    });
  });

  it('should show an error when trying to follow yourself', async () => {
    localStorage.setItem('loggedInDisplayName', 'User1');
    render(
      <MemoryRouter>
        <Main />
      </MemoryRouter>
    );

    // Wait for loading to complete
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());


    // Assume that loggedInUser is the currently logged in user
    const followerInput = screen.getAllByPlaceholderText('Enter display name or username')[0];
    fireEvent.change(followerInput, { target: { value: 'User1' } });
    const addButtons = screen.getAllByText('Add');
    fireEvent.click(addButtons[0]);

    // Wait for error messages to appear and verify
    await waitFor(() => {
        expect(screen.getByText("You cannot follow yourself.")).toBeInTheDocument();
    });
  });

  it('should show an error when trying to add an already followed user', async () => {
    render(
      <MemoryRouter>
        <Main />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

    // Enter an existing follower name
    const followerInput = screen.getAllByPlaceholderText('Enter display name or username')[0];
    fireEvent.change(followerInput, { target: { value: 'Leanne Graham' } });
    const addButtons = screen.getAllByText('Add');
    fireEvent.click(addButtons[0]);

    // Wait for followers to be added successfully
    await waitFor(() => {
        expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
    });

    fireEvent.change(followerInput, { target: { value: 'Leanne Graham' } });
    fireEvent.click(addButtons[0]);

    // Check for error messages
    await waitFor(() => {
        expect(screen.getByText("You have already added this follower.")).toBeInTheDocument();
    });
  });

  it('should log out and clear localStorage when Log Out is clicked', async () => {
      localStorage.setItem('loggedInUserId', '1');
      localStorage.setItem('loggedInUsername', 'User1');
      localStorage.setItem('loggedInDisplayName', 'User Display');
      localStorage.setItem('isRegisteredUser', 'true');
      localStorage.setItem('loggedInEmail', 'user1@example.com');
      localStorage.setItem('loggedInPhone', '123-456-7890');
      localStorage.setItem('loggedInZipcode', '12345');
      localStorage.setItem('loggedInPassword', 'password123');
      localStorage.setItem('loggedInAvatar', 'avatar-url');

      render(
        <MemoryRouter>
          <Main />
        </MemoryRouter>
      );

      await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

      // Make sure to look for the Log Out button after the page loads
      const logOutButton = screen.getAllByText('Log Out');
      fireEvent.click(logOutButton[0]);

      // Check whether the localStorage data is cleared
      expect(localStorage.getItem('loggedInUserId')).toBeNull();
      expect(localStorage.getItem('loggedInUsername')).toBeNull();
      expect(localStorage.getItem('loggedInDisplayName')).toBeNull();
      expect(localStorage.getItem('isRegisteredUser')).toBeNull();
      expect(localStorage.getItem('loggedInEmail')).toBeNull();
      expect(localStorage.getItem('loggedInPhone')).toBeNull();
      expect(localStorage.getItem('loggedInZipcode')).toBeNull();
      expect(localStorage.getItem('loggedInPassword')).toBeNull();
      expect(localStorage.getItem('loggedInAvatar')).toBeNull();

      // Check to navigate back to the login page
      expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should update the user status and save it to localStorage', async () => {
      localStorage.setItem('userStatus', 'Initial Status');

      render(
          <MemoryRouter>
            <Main />
          </MemoryRouter>
      );

      await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

      const statusInput = screen.getAllByPlaceholderText('New Status')[0];
      fireEvent.change(statusInput, { target: { value: 'Updated Status' } });

      const updateButton = screen.getAllByText('Update');
      fireEvent.click(updateButton[0]);

      expect(screen.getByText('Updated Status')).toBeInTheDocument();

      expect(localStorage.getItem('userStatus')).toBe('Updated Status');

      // Check whether the input field is cleared
      expect(statusInput.value).toBe('');
  });

    it('should add a new article and reset input fields', async () => {
        localStorage.setItem('loggedInUserId', '1');
        localStorage.setItem('loggedInDisplayName', 'Test User');

        render(
          <MemoryRouter>
            <Main />
          </MemoryRouter>
        );

        await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

        // Enter the title and content of the new article and upload the picture
        const titleInput = screen.getAllByPlaceholderText('Title')[0];
        fireEvent.change(titleInput, { target: { value: 'Test Title' } });

        const contentInput = screen.getAllByPlaceholderText('Share something interesting!')[0];
        fireEvent.change(contentInput, { target: { value: 'This is a test article content.' } });

        // Simulated upload picture
        const fileInput = screen.getAllByTestId('file-upload')[0];
        const testImageFile = new File(['dummy content'], 'avatar.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [testImageFile] } });

        // Click the Publish button
        const postButton = screen.getAllByText('Post');
        fireEvent.click(postButton[0]);

        await waitFor(() => {
            expect(screen.getByText('Test Title')).toBeInTheDocument();
            expect(screen.getByText('This is a test article content.')).toBeInTheDocument();

            expect(titleInput.value).toBe('');
            expect(contentInput.value).toBe('');
            expect(fileInput.value).toBe('');

            const articlesInDOM = screen.getAllByText('Test Title');
            expect(articlesInDOM.length).toBeGreaterThan(0); // 确保页面中有新添加的文章
        });
    });

    it('should navigate to the profile page when Edit Profile is clicked', async () => {
        await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

        fireEvent.click(screen.getByText('Edit Profile'));

        expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    it('should show an error when trying to follow yourself', async () => {
        render(
            <MemoryRouter>
                <Main />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

        // Enter current user's username
        const followerInput = screen.getAllByPlaceholderText('Enter display name or username')[0];
        fireEvent.change(followerInput, { target: { value: 'User1' } });
        const addButtons = screen.getAllByText('Add');
        fireEvent.click(addButtons[0]);

        // Check for "You cannot follow yourself" error
        await waitFor(() => {
            expect(screen.getByText("You cannot follow yourself.")).toBeInTheDocument();
        });
    });

    it('should navigate to the profile page when Edit Profile is clicked', async () => {
        render(<MemoryRouter><Main /></MemoryRouter>);

        await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
        fireEvent.click(screen.getAllByText('Edit Profile')[0]);
        expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    it('should log out and clear localStorage when Log Out is clicked', async () => {
        render(<MemoryRouter><Main /></MemoryRouter>);

        await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
        fireEvent.click(screen.getAllByText('Log Out')[0]);

        expect(localStorage.getItem('loggedInUserId')).toBeNull();
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should set displayName based on loggedInDisplayName or user.name', async () => {
        localStorage.setItem('loggedInDisplayName', 'Display Name');
        localStorage.setItem('loggedInUserId', '1');
        render(
            <MemoryRouter>
                <Main />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Display Name')).toBeInTheDocument();
        });

        // Clear the loggedInDisplayName test using user.name
        localStorage.removeItem('loggedInDisplayName');
        localStorage.setItem('loggedInUserId', '1');
        render(
            <MemoryRouter>
                <Main />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Leanne Graham')).toBeInTheDocument();  // Replace 'Leanne Graham' with expected name
        });
    });

    it('should set avatar URL based on isRegisteredUser', async () => {
        localStorage.setItem('isRegisteredUser', 'true');
        localStorage.setItem('loggedInUserId', '1');
        render(
            <MemoryRouter>
                <Main />
            </MemoryRouter>
        );

        await waitFor(() => {
            const avatar = screen.getAllByAltText('User avatar')[0];
            expect(avatar).toHaveAttribute('src', `https://picsum.photos/seed/1/200`);
        });

        // Tests if isRegisteredUser is false
        localStorage.setItem('isRegisteredUser', 'false');
        render(
            <MemoryRouter>
                <Main />
            </MemoryRouter>
        );

        await waitFor(() => {
            const avatar = screen.getAllByAltText('User avatar')[0];
            expect(avatar).toHaveAttribute('src', `https://picsum.photos/seed/1/200`); // Replace `1` with `user.id`
        });
    });

    it('should set status based on userStatus, company catchPhrase, or default', async () => {
        // Case 1: userStatus exists
        localStorage.setItem('loggedInUserId', '1');
        render(
            <MemoryRouter>
                <Main />
            </MemoryRouter>
        );

        await waitFor(() => {
            const elements = screen.getAllByText('Multi-layered client-server neural-net');
            expect(elements.length).toBeGreaterThan(0);
        });

        // Case 2: No userStatus and no company exists. The default status is used
        localStorage.setItem('loggedInUserId', '11');
        render(
            <MemoryRouter>
                <Main />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('This is my status!')).toBeInTheDocument();
        });
    });

    it('should render image preview when image is provided', async () => {
        // Mock URL.createObjectURL to return a test URL
        global.URL.createObjectURL = jest.fn(() => 'test-image-url');

        render(
          <MemoryRouter>
            <Main />
          </MemoryRouter>
        );

        await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

        const fileInput = screen.getAllByTestId('file-upload')[0];
        const testImageFile = new File(['dummy content'], 'avatar.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [testImageFile] } });

        expect(screen.getByAltText('Preview')).toBeInTheDocument();
        expect(screen.getByAltText('Preview').src).toContain('test-image-url');
    });

it('should display provided author, title, and body if they exist', async () => {
    const articles = [
      { id: 1, title: 'Custom Title', body: 'Custom Body', author: 'Custom Author', timestamp: new Date().toISOString() }
    ];

    render(
      <MemoryRouter>
        <Posts articles={articles} />
      </MemoryRouter>
    );

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Custom Body'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Custom Author'))).toBeInTheDocument();
  });

  it('should use "Unknown" as the default author if author is missing', async () => {
    const articles = [
      { id: 1, title: 'Custom Title', body: 'Custom Body', timestamp: new Date().toISOString() }
    ];

    render(
      <MemoryRouter>
        <Posts articles={articles} />
      </MemoryRouter>
    );

    expect(screen.getByText((content) => content.includes('By Unknown'))).toBeInTheDocument();
  });

  it('should use "Follower Article" as the default title if title is missing', async () => {
    const articles = [
      { id: 1, body: 'Custom Body', author: 'Custom Author', timestamp: new Date().toISOString() }
    ];

    render(
      <MemoryRouter>
        <Posts articles={articles} />
      </MemoryRouter>
    );

    expect(screen.getByText('Follower Article')).toBeInTheDocument();
  });

  it('should use "Article by new follower" as the default body if body is missing', async () => {
    const articles = [
      { id: 11, title: 'Custom Title', author: 'Custom Author', timestamp: new Date().toISOString() }
    ];

    render(
      <MemoryRouter>
        <Posts articles={articles} />
      </MemoryRouter>
    );

    expect(screen.getByText('Article by new follower')).toBeInTheDocument();
  });

    it('should display a random image if article is system-generated and has no image', () => {
        const articles = [
          {
            id: 1,
            title: 'Sample Title',
            body: 'Sample Body',
            author: 'System',
            timestamp: new Date().toISOString(),
            isSystemGenerated: true, // Simulating a system-generated article
            image: null, // No image provided
          },
        ];

        render(
          <MemoryRouter>
            <Posts articles={articles} />
          </MemoryRouter>
        );

        // Check that the random image is rendered
        const imgElement = screen.getByAltText('Random');
        expect(imgElement).toBeInTheDocument();
        expect(imgElement).toHaveAttribute('src', 'https://picsum.photos/seed/1/200/150');
    });

  it('should display comments when "Show Comments" is clicked', () => {
    const articles = [
      {
        id: 1,
        title: 'Sample Title',
        body: 'Sample Body',
        author: 'Test Author',
        timestamp: new Date().toISOString(),
        comments: [
          { id: 1, text: "This is a great post!" },
          { id: 2, text: "I completely agree with this." },
        ],
      },
    ];

    render(
      <MemoryRouter>
        <Posts articles={articles} />
      </MemoryRouter>
    );

    // Click "Show Comments" to display the comments
    const showCommentsButton = screen.getByText('Show Comments');
    fireEvent.click(showCommentsButton);

    // Verify that comments are displayed
    expect(screen.getByText("This is a great post!")).toBeInTheDocument();
    expect(screen.getByText("I completely agree with this.")).toBeInTheDocument();
  });

  it('should display "No articles to display" when articles array is empty', () => {
    const emptyArticles = [];

    render(<Posts articles={emptyArticles} />);

    // Verify "No articles to display" message appears
    expect(screen.getByText('No articles to display')).toBeInTheDocument();
  });

  it('should clear newArticle and newTitle fields when Cancel button is clicked', async () => {
    render(
      <MemoryRouter>
        <Main />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

    const titleInput = screen.getAllByPlaceholderText('Title')[0];
    const articleInput = screen.getAllByPlaceholderText('Share something interesting!')[0];

    fireEvent.change(titleInput, { target: { value: 'Sample Title' } });
    fireEvent.change(articleInput, { target: { value: 'Sample Article Content' } });

    expect(titleInput.value).toBe('Sample Title');
    expect(articleInput.value).toBe('Sample Article Content');

    fireEvent.click(screen.getAllByText('Cancel')[0]);

    expect(titleInput.value).toBe('');
    expect(articleInput.value).toBe('');
  });

  it('should use user.id for avatar URL when isRegisteredUser is false', async () => {
    localStorage.setItem('loggedInUserId', '1');
    localStorage.setItem('loggedInDisplayName', 'Test User');
    localStorage.removeItem('isRegisteredUser');

    render(
      <MemoryRouter>
        <Main />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

    const avatarImage = screen.getAllByAltText('User avatar')[0];
    expect(avatarImage.src).toBe(`https://picsum.photos/seed/1/200`);
  });

  it('should use "New Post" as the default title if newTitle is not provided', async () => {
    localStorage.setItem('loggedInUserId', '1');
    localStorage.setItem('loggedInDisplayName', 'Test User');

    render(
      <MemoryRouter>
        <Main />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

    const articleInput = screen.getAllByPlaceholderText('Share something interesting!')[0];
    fireEvent.change(articleInput, { target: { value: 'This is a test article content.' } });

    const postButton = screen.getAllByText('Post')[0];
    fireEvent.click(postButton);

    await waitFor(() => {
      expect(screen.getByText('New Post')).toBeInTheDocument();
      expect(screen.getByText('This is a test article content.')).toBeInTheDocument();
    });
  });

});
