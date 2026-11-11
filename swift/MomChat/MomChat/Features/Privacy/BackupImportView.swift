import SwiftData
import SwiftUI
import UniformTypeIdentifiers

/// Restore from a backup file: from Settings (replaces what's on the phone) or from the
/// welcome screen on a new phone. Once restored, the app shows the chat on its own.
struct BackupImportView: View {
    /// From Settings: there is data to replace, so she confirms first.
    let replacesExisting: Bool

    @Environment(\.modelContext) private var context

    @State private var file: URL?
    @State private var password = ""
    @State private var isPicking = false
    @State private var isConfirming = false
    @State private var isWorking = false
    @State private var error: LocalizedStringResource?

    var body: some View {
        Form {
            Section {
                Text(replacesExisting ? .backupImportIntroReplace : .backupImportIntro)
                    .foregroundStyle(Palette.textSecondary)
            }

            Section {
                Button {
                    isPicking = true
                } label: {
                    Label {
                        if let file {
                            Text(verbatim: file.lastPathComponent)
                                .foregroundStyle(Palette.textPrimary)
                        } else {
                            Text(.backupImportChoose)
                        }
                    } icon: {
                        Image(systemName: "doc")
                    }
                }
                SecureField(text: $password) { Text(.backupImportPassword) }
                    .textContentType(.password)
                    .onSubmit(start)
            } footer: {
                if let error {
                    Text(error)
                        .foregroundStyle(.red)
                }
            }

            Section {
                Button(action: start) {
                    HStack {
                        Text(.backupImportRestore)
                        Spacer()
                        if isWorking { ProgressView() }
                    }
                }
                .disabled(file == nil || password.isEmpty || isWorking)
            }
        }
        .scrollContentBackground(.hidden)
        .background(Palette.background)
        .navigationTitle(Text(.backupImportTitle))
        .navigationBarTitleDisplayMode(.inline)
        .fileImporter(isPresented: $isPicking, allowedContentTypes: [.data]) { result in
            if case .success(let url) = result {
                file = url
                error = nil
            }
        }
        .confirmationDialog(Text(.backupImportConfirmTitle), isPresented: $isConfirming, titleVisibility: .visible) {
            Button(.backupImportConfirmAction, role: .destructive, action: restore)
        } message: {
            Text(.backupImportConfirmMessage)
        }
    }

    private func start() {
        guard file != nil, !password.isEmpty, !isWorking else { return }
        if replacesExisting {
            isConfirming = true
        } else {
            restore()
        }
    }

    private func restore() {
        guard let file else { return }
        isWorking = true
        error = nil
        Task {
            defer { isWorking = false }
            do {
                let archive = try await BackupFile.read(file, password: password)
                try archive.restore(into: context)
                // The root view swaps to the restored chat; this screen goes with it.
            } catch let failure as BackupFile.Failure {
                error = failure.message
            } catch {
                self.error = .backupErrorRestoreFailed
            }
        }
    }
}

#Preview {
    NavigationStack { BackupImportView(replacesExisting: true) }
        .modelContainer(try! DataStore.makeInMemoryContainer())
}
