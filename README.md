## SWE 4538 Server Programming Lab Solo Project
# NextDoor Creek: A Neighbourhood Community Platform

## Project Overview:

The **NextDoor Creek** social platform is designed to bring together local community members in a shared online space to connect, discuss, and interact with others. The project aims to solve the problem of lack of local community engagement by providing a digital space where neighbors can share events, marketplace posts, discussions, and lost & found notices. The application features a simple interface, allowing users to easily sign up, post, comment, and interact with other community members, fostering communication and collaboration within a specific neighborhood.

## Feature Descriptions:
* **Authentication**:
   * Users can register and log in using their email and password.
   * Password Hashing using `bcrypt.js`
   * `jwt` based secure session management
* **User Profile**:
   * A user can manage his profile
   * Add Social links
   * Enter Settings page
* **User Settings**:
    * Users can change their password
    * Username
    * Email
    * Notification Settings
    * Account Deactivation
    * Account Deletion
* **Feed Page**:
   * Users can create posts
   * View posts from their following users.
   * Categorize Posts by `flair`/`tags` (event, marketplace, discussion etc.).
* **Following and Unfollowing**:
    * Users can follow or unfollow other users in the commune
* **Comments and Reactions**:
  * Users can comment on posts
  * react with minimal options like `like` and `downvote`.
* **External Links**:
  * Users can add their social media links (currently GitHub) to their profiles, making it easy for others to connect outside the platform.
* **Notifications**:
  * Users will receive notifications for events, posts, or updates from users they follow or interact with.

## Navigation:
The application follows a simple flow:
* **Home Page**: It’s the landing page. Users can go to the login or register page from here.
* **Register**: Users can create accounts. After account creation, they’ll be redirected to the login page.
* **Login**: Users can log in to access the platform and enter the app.
* **Profile Page**: Once logged in, users are redirected to their profile page where they can manage settings, add external links, and view their details.
* **Feed Page**: Once logged in, users are redirected to the feed page where basically members of the community gather to discuss and interact. Users can post, view, comment, and interact with others in their feed, which displays posts from users they follow.
* **Settings Page**: Allows users to update their personal information, password, email etc. Account deactivation and deletion are also handled in this page.

## Tools & Technology:
* **Frontend**:
  * `ejs` for templating.
* **Backend**:
  * `Node.js` with `Express.js` framework.
  * `PostgreSQL` as the DataBase Management System.
* **Authentication**:
  * `jwt` for session management and user authentication.
* **APIs**:
  * Custom `RESTful` API routes for user authentication, post creation, comment handling, etc.
* **Additional Libraries**:
`cookie-parser` for managing cookies.
`csrf` for protecting the app against Cross-Site Request Forgery (CSRF) attacks.
`bcrypt` for secure password hashing.

## API Design:
The API endpoints follow a RESTful approach:
* `POST /auth/register`:
  * Registers a new user.
  * Expected request body: { name, email, password, password2 }.
* `POST /auth/login`:
  * Authenticates a user and returns a JWT token for session management.
  * Expected request body: { email, password }.
* `GET /profile`:
  * Retrieves the logged-in user’s profile data.
* `POST /feed/create-post`:
  * Allows users to create posts.
  * Expected request body: { content, category }.
* `GET /feed`:
  * Retrieves posts from the user and users they follow, with optional category filtering.
* `GET /profile/settings`:
  * Redirects to settings page in order to do operations on user account.
* `POST /profile/follow`:
  * Allows a user to follow another user.
  * Expected request body: { userIdToFollow }.
* `POST /profile/unfollow`:
  * Allows a user to unfollow another user.
  * Expected request body: { userIdToUnfollow }.

## Use Case Scenario:
* **User Registration**:
 John, a new member of the community, registers on the platform by providing his name, email, and password. He receives an email confirmation, logs in, and accesses his profile.
* **Following and Posts**:
 Mary, a user, logs in and follows several neighbors. As she follows them, she sees their posts appear in her feed. She also creates an event post for a local meetup, which is visible to users who follow her.
* **Post Reactions**:
 Sarah comments and likes posts from her friends. She downvotes a marketplace post that doesn't interest her.
* **External Links**:
 James links his GitHub profile to his user account and shares his portfolio with the community.

## Challenges & Solutions:
* **Challenge**: Managing User Authentication
  * **Solution**: Implemented JWT tokens with proper session management and cookie handling to securely authenticate users and protect sensitive routes.
* **Challenge**: Preventing CSRF Attacks
  * **Solution**: Integrated CSRF protection middleware (csrf package) to ensure that all forms are secure and prevent unauthorized access.
* **Challenge**: Handling Post Category Filters
  * **Solution**: Implemented a flexible query system to allow filtering posts by category and ensure posts are only displayed to users who are following others.

## Future Improvements:
* **User Profiles**:
  * Add more customizable options for user profiles such as profile pictures, bios, and location information.
Advanced Notifications:
  * Implement a more advanced notification system that includes push notifications or email notifications when users are mentioned in posts or comments.
* **Private Messaging**:
  * Implement direct messaging between users for private conversations.
  * Improved Search Functionality:
  * Implement a search feature that allows users to find posts, users, and events more easily.
* **UI/UX Improvements**:
  * Enhance the UI/UX with more modern styling and make the app mobile-friendly.

## Conclusion:
Through the development of the NextDoor Creek platform, I have learned a lot about building full-stack applications with Node.js, Express, and PostgreSQL. The project allowed me to gain hands-on experience with authentication, working with databases, implementing RESTful APIs, and securing the application against common vulnerabilities like CSRF. It has also provided insight into UI/UX design, and how to build scalable features like notifications, post management, and social interactions in a community-based application.
