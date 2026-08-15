import { describe, expect, it } from "vitest"
import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthWeakPasswordError,
} from "@supabase/supabase-js"
import { authErrorKey } from "./authErrors"
import en from "@/i18n/locales/en.json"
import pl from "@/i18n/locales/pl.json"

const apiError = (code: string) => new AuthApiError("English text", 400, code)

describe("authErrorKey", () => {
  it("translates the wrong-password case", () => {
    expect(authErrorKey(apiError("invalid_credentials"))).toBe(
      "auth.error.invalid_credentials"
    )
  })

  it("narrows a weak password by its reason", () => {
    const weak = (reason: "length" | "characters" | "pwned") =>
      new AuthWeakPasswordError("English text", 422, [reason])

    expect(authErrorKey(weak("length"))).toBe("auth.error.weak_password_length")
    expect(authErrorKey(weak("characters"))).toBe(
      "auth.error.weak_password_characters"
    )
    expect(authErrorKey(weak("pwned"))).toBe("auth.error.weak_password_pwned")
  })

  it("falls back to the generic weak-password message with no reasons", () => {
    expect(authErrorKey(apiError("weak_password"))).toBe(
      "auth.error.weak_password"
    )
  })

  it("treats a failed fetch as a network problem", () => {
    expect(
      authErrorKey(new AuthRetryableFetchError("Failed to fetch", 0))
    ).toBe("auth.error.network")
  })

  // "Parameters are not in the expected format" - not necessarily the email.
  it("keeps validation_failed field-neutral", () => {
    expect(authErrorKey(apiError("validation_failed"))).toBe(
      "auth.error.validation_failed"
    )
  })

  // Distinct from an expired session: the server wants the change confirmed,
  // the session itself is fine.
  it("separates reauthentication from session expiry", () => {
    expect(authErrorKey(apiError("reauthentication_needed"))).toBe(
      "auth.error.reauthentication_needed"
    )
    expect(authErrorKey(apiError("session_expired"))).toBe(
      "auth.error.session_expired"
    )
  })

  it("reads a code off a plain object, not just an AuthError", () => {
    expect(authErrorKey({ code: "same_password" })).toBe(
      "auth.error.same_password"
    )
  })

  // The whole point of the mapper: an unmapped code must not fall through to
  // Supabase's English message.
  it("returns the generic key for anything unrecognised", () => {
    expect(authErrorKey(apiError("some_future_code"))).toBe(
      "auth.error.unknown"
    )
    expect(authErrorKey(new Error("boom"))).toBe("auth.error.unknown")
    expect(authErrorKey("boom")).toBe("auth.error.unknown")
    expect(authErrorKey(null)).toBe("auth.error.unknown")
  })

  // Enumeration guard - see the comment in authErrors.ts and the one on
  // /forgot-password's success message.
  it("does not tell the user whether an account exists", () => {
    expect(authErrorKey(apiError("user_not_found"))).toBe("auth.error.unknown")
  })
})

/**
 * Every code in the table at
 * https://supabase.com/docs/guides/auth/debugging/error-codes, verbatim.
 * Feeding the whole list through the mapper checks two things at once: that no
 * documented code produces a key we forgot to translate, and that adding a
 * branch without adding the strings fails here rather than in front of a user.
 */
const DOCUMENTED_CODES = [
  "anonymous_provider_disabled",
  "bad_code_verifier",
  "bad_json",
  "bad_jwt",
  "bad_oauth_callback",
  "bad_oauth_state",
  "captcha_failed",
  "conflict",
  "email_address_invalid",
  "email_address_not_authorized",
  "email_conflict_identity_not_deletable",
  "email_exists",
  "email_not_confirmed",
  "email_provider_disabled",
  "flow_state_expired",
  "flow_state_not_found",
  "hook_payload_invalid_content_type",
  "hook_payload_over_size_limit",
  "hook_timeout",
  "hook_timeout_after_retry",
  "identity_already_exists",
  "identity_not_found",
  "insufficient_aal",
  "invalid_credentials",
  "invite_not_found",
  "manual_linking_disabled",
  "mfa_challenge_expired",
  "mfa_factor_name_conflict",
  "mfa_factor_not_found",
  "mfa_ip_address_mismatch",
  "mfa_phone_enroll_not_enabled",
  "mfa_phone_verify_not_enabled",
  "mfa_totp_enroll_not_enabled",
  "mfa_totp_verify_not_enabled",
  "mfa_verification_failed",
  "mfa_verification_rejected",
  "mfa_verified_factor_exists",
  "mfa_web_authn_enroll_not_enabled",
  "mfa_web_authn_verify_not_enabled",
  "no_authorization",
  "not_admin",
  "oauth_provider_not_supported",
  "otp_disabled",
  "otp_expired",
  "over_email_send_rate_limit",
  "over_request_rate_limit",
  "over_sms_send_rate_limit",
  "phone_exists",
  "phone_not_confirmed",
  "phone_provider_disabled",
  "provider_disabled",
  "provider_email_needs_verification",
  "reauthentication_needed",
  "reauthentication_not_valid",
  "refresh_token_already_used",
  "refresh_token_not_found",
  "request_timeout",
  "same_password",
  "saml_assertion_no_email",
  "saml_assertion_no_user_id",
  "saml_entity_id_mismatch",
  "saml_idp_already_exists",
  "saml_idp_not_found",
  "saml_metadata_fetch_failed",
  "saml_provider_disabled",
  "saml_relay_state_expired",
  "saml_relay_state_not_found",
  "session_expired",
  "session_not_found",
  "signup_disabled",
  "single_identity_not_deletable",
  "sms_send_failed",
  "sso_domain_already_exists",
  "sso_provider_not_found",
  "too_many_enrolled_mfa_factors",
  "unexpected_audience",
  "unexpected_failure",
  "user_already_exists",
  "user_banned",
  "user_not_found",
  "user_sso_managed",
  "validation_failed",
  "weak_password",
]

describe("auth error keys", () => {
  const PRODUCED = [
    ...new Set([
      ...DOCUMENTED_CODES.map((code) => authErrorKey(apiError(code))),
      "auth.error.weak_password_length",
      "auth.error.weak_password_characters",
      "auth.error.weak_password_pwned",
      "auth.error.network",
    ]),
  ]

  it.each(PRODUCED)("%s exists in both locales", (key) => {
    expect(pl).toHaveProperty([key])
    expect(en).toHaveProperty([key])
  })
})
