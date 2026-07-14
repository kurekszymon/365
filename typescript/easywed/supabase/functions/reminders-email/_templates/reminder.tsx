import * as React from "npm:react@18.3.1"
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22"

export type ReminderLocale = "pl" | "en"

interface ReminderEmailProps {
  text: string
  due?: string | null
  locale: ReminderLocale
}

const copy = {
  pl: {
    preview: "Przypomnienie o Twoim ślubie",
    heading: "Przypomnienie",
    dueLabel: "Termin:",
    footer: "Wiadomość wysłana z planera wesela.",
    dateLocale: "pl-PL",
  },
  en: {
    preview: "A reminder about your wedding",
    heading: "Reminder",
    dueLabel: "Due:",
    footer: "Sent from your wedding planner.",
    dateLocale: "en-US",
  },
} as const

const formatDue = (due: string, locale: ReminderLocale): string =>
  new Intl.DateTimeFormat(copy[locale].dateLocale, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(due))

export const ReminderEmail = ({ text, due, locale }: ReminderEmailProps) => {
  const t = copy[locale]

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>{t.heading}</Heading>
          <Section>
            <Text style={paragraph}>{text}</Text>
            {due ? (
              <Text style={dueText}>
                {t.dueLabel} {formatDue(due, locale)}
              </Text>
            ) : null}
          </Section>
          <Text style={footer}>{t.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ReminderEmail

const main = {
  backgroundColor: "#f6f6f6",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "24px",
  maxWidth: "480px",
  borderRadius: "8px",
}

const heading = {
  fontSize: "20px",
  fontWeight: "600",
  color: "#111827",
}

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.5",
  color: "#374151",
  whiteSpace: "pre-wrap" as const,
}

const dueText = {
  fontSize: "14px",
  color: "#6b7280",
}

const footer = {
  fontSize: "12px",
  color: "#9ca3af",
  marginTop: "24px",
}
