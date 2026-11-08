import SwiftUI

/// The words on each emergency card. Needs a midwife or pediatrician's review.
extension EmergencyTopic {
    struct Copy {
        let title: LocalizedStringResource
        let steps: [LocalizedStringResource]
    }

    var copy: Copy {
        switch self {
        case .babyNotBreathing: Copy(title: .emergencyBabyNotBreathingTitle, steps: [.emergencyBabyNotBreathingStep1, .emergencyBabyNotBreathingStep2, .emergencyBabyNotBreathingStep3])
        case .babyChoking: Copy(title: .emergencyBabyChokingTitle, steps: [.emergencyBabyChokingStep1, .emergencyBabyChokingStep2, .emergencyBabyChokingStep3])
        case .babyUnresponsive: Copy(title: .emergencyBabyUnresponsiveTitle, steps: [.emergencyBabyUnresponsiveStep1, .emergencyBabyUnresponsiveStep2, .emergencyBabyUnresponsiveStep3])
        case .babySeizure: Copy(title: .emergencyBabySeizureTitle, steps: [.emergencyBabySeizureStep1, .emergencyBabySeizureStep2, .emergencyBabySeizureStep3])
        case .babyFever: Copy(title: .emergencyBabyFeverTitle, steps: [.emergencyBabyFeverStep1, .emergencyBabyFeverStep2, .emergencyBabyFeverStep3])
        case .babyHeadInjury: Copy(title: .emergencyBabyHeadInjuryTitle, steps: [.emergencyBabyHeadInjuryStep1, .emergencyBabyHeadInjuryStep2, .emergencyBabyHeadInjuryStep3])
        case .babyPoisoning: Copy(title: .emergencyBabyPoisoningTitle, steps: [.emergencyBabyPoisoningStep1, .emergencyBabyPoisoningStep2, .emergencyBabyPoisoningStep3])
        case .babyDehydration: Copy(title: .emergencyBabyDehydrationTitle, steps: [.emergencyBabyDehydrationStep1, .emergencyBabyDehydrationStep2, .emergencyBabyDehydrationStep3])
        case .pregnancyBleeding: Copy(title: .emergencyPregnancyBleedingTitle, steps: [.emergencyPregnancyBleedingStep1, .emergencyPregnancyBleedingStep2, .emergencyPregnancyBleedingStep3])
        case .pregnancyAbdominalPain: Copy(title: .emergencyPregnancyAbdominalPainTitle, steps: [.emergencyPregnancyAbdominalPainStep1, .emergencyPregnancyAbdominalPainStep2, .emergencyPregnancyAbdominalPainStep3])
        case .pregnancyFainting: Copy(title: .emergencyPregnancyFaintingTitle, steps: [.emergencyPregnancyFaintingStep1, .emergencyPregnancyFaintingStep2, .emergencyPregnancyFaintingStep3])
        case .pregnancyWatersOrContractions: Copy(title: .emergencyPregnancyWatersOrContractionsTitle, steps: [.emergencyPregnancyWatersOrContractionsStep1, .emergencyPregnancyWatersOrContractionsStep2, .emergencyPregnancyWatersOrContractionsStep3])
        case .pregnancyReducedMovement: Copy(title: .emergencyPregnancyReducedMovementTitle, steps: [.emergencyPregnancyReducedMovementStep1, .emergencyPregnancyReducedMovementStep2, .emergencyPregnancyReducedMovementStep3])
        case .pregnancyPreeclampsia: Copy(title: .emergencyPregnancyPreeclampsiaTitle, steps: [.emergencyPregnancyPreeclampsiaStep1, .emergencyPregnancyPreeclampsiaStep2, .emergencyPregnancyPreeclampsiaStep3])
        case .pregnancyFever: Copy(title: .emergencyPregnancyFeverTitle, steps: [.emergencyPregnancyFeverStep1, .emergencyPregnancyFeverStep2, .emergencyPregnancyFeverStep3])
        case .postpartumBleeding: Copy(title: .emergencyPostpartumBleedingTitle, steps: [.emergencyPostpartumBleedingStep1, .emergencyPostpartumBleedingStep2, .emergencyPostpartumBleedingStep3])
        case .postpartumChestOrBreathing: Copy(title: .emergencyPostpartumChestOrBreathingTitle, steps: [.emergencyPostpartumChestOrBreathingStep1, .emergencyPostpartumChestOrBreathingStep2, .emergencyPostpartumChestOrBreathingStep3])
        case .postpartumInfection: Copy(title: .emergencyPostpartumInfectionTitle, steps: [.emergencyPostpartumInfectionStep1, .emergencyPostpartumInfectionStep2, .emergencyPostpartumInfectionStep3])
        case .crisis: Copy(title: .emergencyHeadlineCrisis, steps: [])
        }
    }
}
