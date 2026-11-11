import SwiftData
import SwiftUI

/// Settings → Back up to a file. She picks a password, then saves or sends the encrypted file.
struct BackupExportView: View {
    @Environment(\.modelContext) private var context

    @State private var password = ""
    @State private var confirmation = ""
    @State private var isWorking = false
    @State private var file: URL?
    @State private var failed = false

    private var passwordProblem: LocalizedStringResource? {
        if password.count < BackupFile.minimumPasswordLength { return .backupExportPasswordTooShort(BackupFile.minimumPasswordLength) }
        if password != confirmation { return .backupExportPasswordMismatch }
        return nil
    }

    var body: some View {
        Form {
            Section {
                Text(.backupExportIntro)
                    .foregroundStyle(Palette.textSecondary)
            }

            if let file {
                Section {
                    ShareLink(item: file) {
                        Label {
                            Text(.backupExportShare)
                        } icon: {
                            Image(systemName: "square.and.arrow.up")
                        }
                    }
                } footer: {
                    Text(.backupExportShareFooter)
                }
            } else {
                Section {
                    SecureField(text: $password) { Text(.backupExportPassword) }
                        .textContentType(.newPassword)
                    SecureField(text: $confirmation) { Text(.backupExportConfirm) }
                        .textContentType(.newPassword)
                } footer: {
                    VStack(alignment: .leading, spacing: Spacing.s) {
                        if !password.isEmpty, let passwordProblem {
                            Text(passwordProblem)
                        }
                        Text(.backupExportWarning)
                            .fontWeight(.semibold)
                    }
                }

                Section {
                    Button {
                        create()
                    } label: {
                        HStack {
                            Text(.backupExportCreate)
                            Spacer()
                            if isWorking { ProgressView() }
                        }
                    }
                    .disabled(passwordProblem != nil || isWorking)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Palette.background)
        .navigationTitle(Text(.backupExportTitle))
        .navigationBarTitleDisplayMode(.inline)
        .alert(Text(.backupExportFailed), isPresented: $failed) {
            Button(.commonOk) {}
        }
        .onDisappear { BackupFile.removeTemporaryFiles() }
    }

    private func create() {
        isWorking = true
        Task {
            defer { isWorking = false }
            do {
                file = try await BackupFile.export(from: context, password: password)
                password = ""
                confirmation = ""
            } catch {
                failed = true
            }
        }
    }
}

#Preview {
    NavigationStack { BackupExportView() }
        .modelContainer(try! DataStore.makeInMemoryContainer())
}
