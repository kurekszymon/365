import FoundationModels
import Observation

/// Tracks whether Apple's on-device model can be used, and keeps checking while it downloads.
@Observable
final class ModelAvailability {
    nonisolated enum State: Equatable, Sendable {
        case checking
        case available
        case notEnabled
        case downloading
        case deviceNotEligible
        /// A reason added in a later iOS version that we don't know about yet.
        case unavailable
    }

    private(set) var state: State = .checking
    private var pollTask: Task<Void, Never>?

    init() {
        refresh()
    }

    func refresh() {
        state = Self.map(SystemLanguageModel.default.availability)
        if state == .downloading {
            startPolling()
        } else {
            pollTask?.cancel()
            pollTask = nil
        }
    }

    /// The model download takes a while and nothing notifies us, so look again every few seconds.
    private func startPolling() {
        guard pollTask == nil else { return }
        pollTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(5))
                guard let self, !Task.isCancelled else { return }
                self.state = Self.map(SystemLanguageModel.default.availability)
                if self.state != .downloading {
                    self.pollTask = nil
                    return
                }
            }
        }
    }

    nonisolated static func map(_ availability: SystemLanguageModel.Availability) -> State {
        switch availability {
        case .available: .available
        case .unavailable(.appleIntelligenceNotEnabled): .notEnabled
        case .unavailable(.modelNotReady): .downloading
        case .unavailable(.deviceNotEligible): .deviceNotEligible
        case .unavailable: .unavailable
        }
    }
}
