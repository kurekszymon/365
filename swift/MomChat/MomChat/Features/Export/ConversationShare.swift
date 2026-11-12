import CoreTransferable
import SwiftData
import SwiftUI
import UniformTypeIdentifiers

/// One conversation as a PDF for the share sheet. Only the conversation's ID is held: the PDF is
/// made when she picks where to send it, not every time the chat redraws.
nonisolated struct ConversationPDFItem: Transferable {
    let conversationID: PersistentIdentifier
    let container: ModelContainer

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(exportedContentType: .pdf) { item in
            let url = try await MainActor.run { try ConversationExport.write(item.conversationID, in: item.container.mainContext) }
            return SentTransferredFile(url)
        }
    }
}

enum ConversationExport {
    enum Failure: Error {
        case missing
    }

    /// Writes the PDF to a temporary folder. The share sheet copies it; the folder is emptied before
    /// the next export, so only the latest one is ever left on the phone.
    static func write(_ id: PersistentIdentifier, in context: ModelContext, now: Date = .now) throws -> URL {
        guard let conversation = context.model(for: id) as? Conversation, !conversation.messages.isEmpty else { throw Failure.missing }
        let mom = try? context.fetch(FetchDescriptor<MomProfile>()).first
        let report = ConversationReport(conversation: conversation, mom: mom, now: now)

        removeTemporaryFiles()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let url = directory.appending(path: report.fileName + ".pdf")
        try ConversationPDF.data(for: report).write(to: url, options: [.atomic, .completeFileProtection])
        return url
    }

    static func removeTemporaryFiles() {
        try? FileManager.default.removeItem(at: directory)
    }

    private static var directory: URL {
        URL.temporaryDirectory.appending(path: "Export", directoryHint: .isDirectory)
    }
}

/// The Share button for a saved conversation. Shown disabled for a chat with nothing saved yet.
struct ConversationShareButton: View {
    let conversation: Conversation?

    @Environment(\.modelContext) private var context

    var body: some View {
        if let conversation, !conversation.messages.isEmpty {
            ShareLink(
                item: ConversationPDFItem(conversationID: conversation.persistentModelID, container: context.container),
                preview: SharePreview(Text(.exportPdfSharePreview), image: Image(systemName: "doc.richtext"))
            ) {
                Label { Text(.exportPdfShare) } icon: { Image(systemName: "square.and.arrow.up") }
            }
        } else {
            Button {} label: {
                Label { Text(.exportPdfShare) } icon: { Image(systemName: "square.and.arrow.up") }
            }
            .disabled(true)
        }
    }
}
