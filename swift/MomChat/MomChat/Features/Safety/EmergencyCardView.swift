import SwiftUI

/// Full screen, opened by `EmergencyGate` before the model is called. One big action, big text.
struct EmergencyCardView: View {
    let topic: EmergencyTopic
    var numbers: EmergencyNumbers = .current
    /// `nil` when the card was reopened for an older message.
    var onAskAnyway: (() -> Void)?
    let onClose: () -> Void

    @Environment(\.openURL) private var openURL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.l) {
                Image(systemName: topic.level == .crisis ? "heart.fill" : "phone.fill")
                    .font(.largeTitle)
                    .foregroundStyle(Palette.accent)
                    .accessibilityHidden(true)
                Text(headline)
                    .font(.title.bold())
                    .foregroundStyle(Palette.textPrimary)
                if topic.level != .crisis {
                    Text(topic.copy.title)
                        .font(.title3)
                        .foregroundStyle(Palette.textPrimary)
                }
                actions
                if !topic.copy.steps.isEmpty { steps }
                footerButtons
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Spacing.l)
        }
        .background(Palette.background)
    }

    private var headline: LocalizedStringResource {
        switch topic.level {
        case .emergency: .emergencyHeadlineEmergency
        case .midwife: .emergencyHeadlineMidwife
        case .crisis: .emergencyHeadlineCrisis
        }
    }

    @ViewBuilder
    private var actions: some View {
        switch topic.level {
        case .emergency:
            emergencyButtons
        case .midwife:
            if let advice = numbers.advice {
                callButton(.emergencyActionCallAdvice(advice), number: advice)
            }
            note(.emergencyMidwifeFallback)
            emergencyButtons
        case .crisis:
            note(.emergencyCrisisBody)
            if let crisis = numbers.crisis {
                callButton(.emergencyActionCallCrisis(crisis), number: crisis)
            } else {
                note(.emergencyCrisisNoLine)
            }
            note(.emergencyCrisisDanger)
            emergencyButtons
        }
    }

    @ViewBuilder
    private var emergencyButtons: some View {
        if let emergency = numbers.emergency {
            callButton(.emergencyActionCall(emergency), number: emergency)
            if let alternative = numbers.alternative {
                Button {
                    call(alternative)
                } label: {
                    Text(.emergencyActionCall(alternative))
                }
                .font(Typography.chip)
                .tint(Palette.accent)
            }
        } else {
            Text(.emergencyLocalNumber)
                .font(.title3.bold())
                .foregroundStyle(Palette.textPrimary)
        }
    }

    private var steps: some View {
        VStack(alignment: .leading, spacing: Spacing.s) {
            Text(.emergencyStepsHeader)
                .font(.headline)
                .foregroundStyle(Palette.textPrimary)
            ForEach(Array(topic.copy.steps.enumerated()), id: \.offset) { index, step in
                HStack(alignment: .top, spacing: Spacing.s) {
                    Text(verbatim: "\(index + 1).")
                    Text(step)
                }
                .font(Typography.body)
                .foregroundStyle(Palette.textPrimary)
            }
        }
    }

    private var footerButtons: some View {
        VStack(spacing: Spacing.m) {
            if let onAskAnyway {
                Button(.emergencyAskAnyway, action: onAskAnyway)
            }
            Button(.emergencyClose, action: onClose)
        }
        .font(Typography.chip)
        .tint(Palette.accent)
        .frame(maxWidth: .infinity)
        .padding(.top, Spacing.l)
    }

    private func note(_ text: LocalizedStringResource) -> some View {
        Text(text)
            .font(Typography.body)
            .foregroundStyle(Palette.textPrimary)
    }

    private func callButton(_ title: LocalizedStringResource, number: String) -> some View {
        Button {
            call(number)
        } label: {
            Text(title)
                .font(.title3.bold())
                .foregroundStyle(Palette.onAccent)
                .frame(maxWidth: .infinity, minHeight: 56)
                .background(Palette.accent, in: .rect(cornerRadius: Radius.field, style: .continuous))
        }
    }

    private func call(_ number: String) {
        if let url = EmergencyNumbers.callURL(number) { openURL(url) }
    }
}

/// In the chat, under a message that opened a card. Explains why there's no answer.
struct EmergencyNotice: View {
    let onOpen: () -> Void

    var body: some View {
        MessageBubble(isUser: false) {
            VStack(alignment: .leading, spacing: Spacing.s) {
                Text(.emergencyNotice)
                    .foregroundStyle(Palette.textSecondary)
                Button(.emergencyNoticeOpen, action: onOpen)
                    .font(Typography.chip)
                    .tint(Palette.accent)
            }
        }
    }
}

/// Local support details under an answer about low mood or a loss.
struct SupportCard: View {
    let topic: SupportTopic
    var numbers: EmergencyNumbers = .current

    @Environment(\.openURL) private var openURL

    var body: some View {
        MessageBubble(isUser: false) {
            VStack(alignment: .leading, spacing: Spacing.s) {
                Text(topic == .loss ? .supportLossTitle : .supportMentalHealthTitle)
                    .font(.headline)
                Text(topic == .loss ? .supportLossBody : .supportMentalHealthBody)
                if let crisis = numbers.crisis, let url = EmergencyNumbers.callURL(crisis) {
                    Button {
                        openURL(url)
                    } label: {
                        Text(.emergencyActionCallCrisis(crisis))
                    }
                    .font(Typography.chip)
                    .tint(Palette.accent)
                }
            }
        }
    }
}

#Preview("Emergency") {
    EmergencyCardView(topic: .babyNotBreathing, numbers: .forRegion("PL"), onAskAnyway: {}, onClose: {})
}

#Preview("Midwife") {
    EmergencyCardView(topic: .pregnancyReducedMovement, numbers: .forRegion("GB"), onAskAnyway: {}, onClose: {})
}

#Preview("Crisis") {
    EmergencyCardView(topic: .crisis, numbers: .forRegion("US"), onAskAnyway: {}, onClose: {})
}
