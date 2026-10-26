import SwiftUI
import UIKit

/// Built from four base colors: taupe #C9AC9C, mauve #B38093, lavender grey #DDD5DD
/// and sage #B0D4B4. Mauve is the accent, taupe tints the mom's bubbles, sage marks
/// the quick-action chips and lavender grey tints the neutrals. Every text/background
/// pair is at least 4.5:1 (WCAG AA).
enum Palette {
    static let background = Color(light: 0xF7F3F6, dark: 0x1C171C)
    static let surface = Color(light: 0xEEE7ED, dark: 0x282128)
    static let separator = Color(light: 0xDDD5DD, dark: 0x3A313A)

    static let textPrimary = Color(light: 0x2E2630, dark: 0xEDE6ED)
    static let textSecondary = Color(light: 0x6B5E6D, dark: 0xADA1AD)

    static let accent = Color(light: 0x8E5A6E, dark: 0xC99AAB)
    static let onAccent = Color(light: 0xFFFFFF, dark: 0x2A1720)

    static let bubbleUser = Color(light: 0xEBDDD4, dark: 0x4E3644)
    static let bubbleAssistant = Color(light: 0xFFFFFF, dark: 0x2C252C)

    static let chip = Color(light: 0xDCEDDE, dark: 0x24302A)
    static let onChip = Color(light: 0x2F4A35, dark: 0xB0D4B4)
}

extension Color {
    /// A color that follows the system appearance, given as 0xRRGGBB values.
    init(light: UInt32, dark: UInt32) {
        self.init(uiColor: UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

private extension UIColor {
    convenience init(hex: UInt32) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}
