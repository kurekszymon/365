import SwiftUI

/// Edits a list like allergies as one comma-separated line. The text is kept locally while typing,
/// so a trailing comma isn't swallowed by the round trip through the array.
struct ListField: View {
    let placeholder: LocalizedStringResource
    @Binding var items: [String]

    @State private var text: String

    init(_ placeholder: LocalizedStringResource, items: Binding<[String]>) {
        self.placeholder = placeholder
        _items = items
        _text = State(initialValue: items.wrappedValue.joined(separator: ", "))
    }

    var body: some View {
        TextField(String(localized: placeholder), text: $text, axis: .vertical)
            .lineLimit(1...4)
            .onChange(of: text) { _, text in
                items = OnboardingDraft.list(text)
            }
    }
}

extension Binding where Value == String? {
    /// For a `TextField`: empty or blank text is stored as `nil`.
    var orEmpty: Binding<String> {
        Binding<String>(
            get: { wrappedValue ?? "" },
            set: { wrappedValue = OnboardingDraft.optional($0) == nil ? nil : $0 }
        )
    }
}
