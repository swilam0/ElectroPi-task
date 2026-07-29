# Glossary — Canonical Domain Definitions

| Term | Definition |
|------|------------|
| **User** | A person with an account in the system. Identified by unique email. Has a bcrypt-hashed password and one of two roles: ADMIN or MEMBER. |
| **Admin** | A User role with elevated privileges. Can create/update/delete any project, add/remove project members, and manage all users. Full system access. |
| **Member** | A User role with limited privileges. Can create projects, manage tasks within projects they belong to, and view project boards they are added to. Cannot manage user roles or project membership. |
| **Project** | A named container for a collection of tasks. Has a title, description, and a list of members. Created by any User. Projects are private — only members can see and interact with them. |
| **Task** | A unit of work within a Project. Has a title, description, status, priority, due date, creator, and optional assignee. Status must follow the state machine: TODO ↔ IN_PROGRESS ↔ DONE. |
| **Assignment** | The relationship between a Task and the User responsible for completing it. A Task has zero or one assignee. An assignee must be a member of the Task's parent Project. |
| **Status** | The current stage of a Task in its workflow. One of: TODO, IN_PROGRESS, DONE. Transitions are governed by the state machine defined in `docs/modules/tasks-module.md`. |
| **Priority** | The importance level of a Task. One of: LOW, MEDIUM, HIGH. Used for sorting and filtering. Does not affect status transitions. |
| **Project Membership** | The relationship linking a User to a Project. A User must be a member of a Project to see it, see its tasks, or create tasks within it. Membership is managed exclusively by Admins. |
| **Access Token** | A short-lived JWT (15 min) sent with every authenticated request in the `Authorization: Bearer <token>` header. Contains userId, email, and role. Signed with `JWT_SECRET`. |
| **Refresh Token** | A longer-lived JWT (7 days) used to obtain new access tokens without re-authentication. Stored in the database for rotation and revocation. Signed with `JWT_REFRESH_SECRET`. |
| **Credentials** | The combination of email and password used to authenticate a User. Email must be unique. Password must be at least 8 characters. |
