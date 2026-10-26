import SwiftUI

struct RootView: View {
    // Hardcoded until Stage 4 saves a real MomProfile.
    @State private var hasProfile = false

    var body: some View {
        Group {
            if hasProfile {
                NavigationStack {
                    ChatView()
                }
            } else {
                OnboardingPlaceholderView {
                    hasProfile = true
                }
            }
        }
        .animation(.default, value: hasProfile)
    }
}

#Preview {
    RootView()
}
