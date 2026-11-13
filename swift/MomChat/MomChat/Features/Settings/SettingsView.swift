import StoreKit
import SwiftData
import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Environment(QuestionAccess.self) private var access
    @Environment(AppLock.self) private var lock
    @Environment(\.openURL) private var openURL

    @State private var isShowingPaywall = false
    @State private var isManagingSubscription = false
    @State private var isRestoringPurchases = false
    @State private var isConfirmingDelete = false
    @State private var notice: LocalizedStringResource?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink {
                        ProfilesView()
                    } label: {
                        Label {
                            Text(.settingsProfiles)
                        } icon: {
                            Image(systemName: "person.2")
                        }
                    }
                }

                planSection
                privacySection
                supportSection

                Section {
                    Button(role: .destructive) {
                        isConfirmingDelete = true
                    } label: {
                        Text(.settingsDeleteEverything)
                    }
                } footer: {
                    Text(.settingsDeleteEverythingFooter)
                }

                #if DEBUG
                Section {
                    NavigationLink(String("Developer tools")) { DebugView() }
                }
                #endif
            }
            .scrollContentBackground(.hidden)
            .background(Palette.background)
            .navigationTitle(Text(.settingsTitle))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(.commonDone) { dismiss() }
                }
            }
            .sheet(isPresented: $isShowingPaywall) {
                PaywallView()
            }
            .manageSubscriptionsSheet(isPresented: $isManagingSubscription)
            .confirmationDialog(Text(.settingsDeleteConfirmTitle), isPresented: $isConfirmingDelete, titleVisibility: .visible) {
                Button(.settingsDeleteConfirmAction, role: .destructive, action: deleteEverything)
            } message: {
                Text(.settingsDeleteConfirmMessage)
            }
            .alert(Text(notice ?? .settingsDeleteFailed), isPresented: Binding(get: { notice != nil }, set: { if !$0 { notice = nil } })) {
                Button(.commonOk) {}
            }
        }
        .tint(Palette.accent)
    }

    // MARK: Sections

    private var planSection: some View {
        Section {
            if access.entitlements.isEntitled {
                Text(.settingsPlanFullAccess)
                Button(.settingsPlanManage) { isManagingSubscription = true }
            } else {
                Text(.settingsPlanFreeLeft(access.free.remaining))
                Button(.settingsPlanSeePlans) { isShowingPaywall = true }
            }
            Button(action: restorePurchases) {
                HStack {
                    Text(.settingsPlanRestore)
                    Spacer()
                    if isRestoringPurchases { ProgressView() }
                }
            }
            .disabled(isRestoringPurchases)
        } header: {
            Text(.settingsPlanHeader)
        }
    }

    private var privacySection: some View {
        Section {
            if let method = lock.method {
                // A closure, not `set: setLock`: passing the method crashes the Swift 6.3 compiler.
                Toggle(isOn: Binding(get: { lock.isEnabled }, set: { setLock($0) })) {
                    Text(method == .faceID ? .settingsLockFaceID : .settingsLockPasscode)
                }
                .disabled(lock.isAuthenticating)
            } else {
                Text(.settingsLockUnavailable)
                    .foregroundStyle(Palette.textSecondary)
            }
            NavigationLink { BackupExportView() } label: {
                Text(.settingsBackupExport)
            }
            NavigationLink { BackupImportView(replacesExisting: true) } label: {
                Text(.settingsBackupImport)
            }
            NavigationLink { PrivacyInfoView() } label: {
                Text(.settingsPrivacyInfo)
            }
            if let url = AppLinks.privacyPolicy {
                Link(destination: url) { Text(.settingsPrivacyPolicy) }
            }
        } header: {
            Text(.settingsPrivacyHeader)
        } footer: {
            Text(.settingsLockFooter)
        }
    }

    @ViewBuilder
    private var supportSection: some View {
        if AppLinks.supportEmail != nil || AppLinks.terms != nil {
            Section {
                if let address = AppLinks.supportEmail {
                    Button(.settingsFeedbackSend) { sendFeedback(to: address) }
                }
                if let url = AppLinks.terms {
                    Link(destination: url) { Text(.settingsSupportTerms) }
                }
            } header: {
                Text(.settingsSupportHeader)
            }
        }
    }

    // MARK: Actions

    /// Opens a draft in her mail app. Without one, tells her the address to write to.
    private func sendFeedback(to address: String) {
        guard let url = FeedbackMail.current.url(to: address) else { return }
        openURL(url) { opened in
            if !opened { notice = .settingsFeedbackNoMail(address) }
        }
    }

    /// Turning the lock on or off asks for Face ID first, so someone holding an unlocked phone can't switch it off.
    private func setLock(_ enabled: Bool) {
        Task {
            if await lock.confirmOwner() {
                lock.setEnabled(enabled)
            }
        }
    }

    private func restorePurchases() {
        isRestoringPurchases = true
        Task {
            defer { isRestoringPurchases = false }
            do {
                try await AppStore.sync()
                await access.entitlements.refresh()
                notice = access.entitlements.isEntitled ? .settingsPlanRestored : .paywallNothingToRestore
            } catch StoreKitError.userCancelled {
                // She closed Apple's sign-in. Nothing to report.
            } catch {
                notice = .paywallRestoreFailed
            }
        }
    }

    /// The root view switches to onboarding once the profile is gone, closing this sheet.
    private func deleteEverything() {
        do {
            try DataWipe.everything(in: context, lock: lock)
        } catch {
            notice = .settingsDeleteFailed
        }
    }
}

#Preview {
    SettingsView()
        .environment(QuestionAccess())
        .environment(AppLock())
        .modelContainer(try! DataStore.makeInMemoryContainer())
}
