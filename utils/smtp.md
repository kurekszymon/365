# SMTP

## disclaimer

content of this may not be up to date when you are reading this, as I don't control what those providers offer. this is how i handled it as of _7th of june 2026_.

nothing in this article is an ad - it's just that Cloudflare's dashboard and DNS management is actually usable - something I can't say about other providers I tried and Zoho is free to set up with custom domain.

## domain

normally I'd buy a domain with email already set up - this saves you time, but not necessarily money.
I bought _easywed.app_ via [Cloudflare Registrar](https://domains.cloudflare.com/) and afterwards I noticed there is no option to have a mail server setup with it, besides [Email Routing](https://developers.cloudflare.com/email-routing/), which wasn't ideal for my use case.

## mail server

there is a lot of options to set up a mail server, like [ProtonMail](https://proton.me/mail), [Google Workspace](https://workspace.google.com/), etc.
[Zoho](https://www.zoho.com/mail/) is free to set up with custom domain up to 5 users, which is why I picked it.

- create an account in Zoho
- go through the onboarding
- set up a domain
- create a mailbox user, like _no-reply@your-domain.com_
- follow email configuration at https://mailadmin.zoho.eu/cpanel/home.do#domains/{domain}/emailConfig/{config} - most of the configs will be done automatically by them if you agree to it, you can also set DNS records manually.
- enable _DMARC_ in cloudflare and edit it to values set in DMARC config in Zoho

---

If you want to use SMTP server (i.e. to send emails via supabase in your login flow) you need to have 2FA configured in zoho.

This will allow you to [generate application-specific password](https://accounts.zoho.eu/home#security/app_password) needed for sending an email using SMTP protocol

use this password to authenticate your email sending user
link to SMTP config in [docs ref](#docs-ref)

---

## docs ref

- [Cloudflare Registrar](https://developers.cloudflare.com/registrar/)
- [Email Routing](https://developers.cloudflare.com/email-routing/)
- [Zoho 2FA](https://www.zoho.com/mail/help/adminconsole/two-factor-authentication.html)
- [Zoho App-Specific Password](https://help.zoho.com/portal/en/kb/bigin/channels/email/articles/generate-an-app-specific-password#To_generate_app_specific_password_for_Zoho_Mail)
- [Zoho SMTP config](https://www.zoho.com/mail/help/zoho-smtp.html)
