# Page snapshot

```yaml
- alert
- button "Open Next.js Dev Tools":
  - img
- heading "Welcome back to DomainFlow" [level=3]
- paragraph: Sign in to your account to continue
- text: Email
- textbox "Email": test@example.com
- text: Password
- textbox "Password": password123
- button
- button "Sign in Securely"
- text: Don't have an account?
- link "Sign up":
  - /url: /signup
```