# Page snapshot

```yaml
- alert
- button "Open Next.js Dev Tools":
  - img
- heading "Welcome back to DomainFlow" [level=3]
- paragraph: Sign in to your account to continue
- text: Email
- textbox "Email" [disabled]: test@example.com
- text: Password
- textbox "Password" [disabled]: password123
- button [disabled]
- button "Signing in..." [disabled]
- text: Don't have an account?
- link "Sign up":
  - /url: /signup
```