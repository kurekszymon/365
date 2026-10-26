import SwiftUI

/// Text styles. All are built on Dynamic Type styles so they scale with the user's text size.
enum Typography {
    static let largeTitle = Font.system(.largeTitle, design: .rounded, weight: .semibold)
    static let body = Font.body
    static let chip = Font.subheadline.weight(.medium)
    static let caption = Font.footnote
}
