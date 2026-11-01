import Foundation

/// Starter questions on an empty chat, picked for the exact stage. A tap puts the full question
/// in the input field, so she can change it before sending.
enum StarterChip: String, CaseIterable, Identifiable {
    // Pregnancy
    case cramping, nausea, foodsToAvoid, exercise
    case backPain, babyKicks, sleepPositions, whatToEat
    case contractions, hospitalBag, signsOfLabor
    // Baby and toddler
    case sleep, feedingEnough, crying, poop, cesareanRecovery
    case solids, teething, milestones
    case tantrums, pickyEating, talking

    var id: String { rawValue }

    static func chips(for child: Child?, on date: Date = .now, calendar: Calendar = .current) -> [StarterChip] {
        guard let child else { return [] }
        if let progress = child.pregnancy(on: date, calendar: calendar) {
            switch progress.trimester {
            case 1: return [.cramping, .nausea, .foodsToAvoid, .exercise]
            case 2: return [.backPain, .babyKicks, .sleepPositions, .whatToEat]
            default: return [.contractions, .hospitalBag, .signsOfLabor, .sleepPositions]
            }
        }
        guard let age = child.age(on: date, calendar: calendar) else { return [] }
        switch age {
        case .days, .weeks:
            var chips: [StarterChip] = [.sleep, .feedingEnough, .crying, .poop]
            if child.deliveryType == .cesarean { chips.append(.cesareanRecovery) }
            return chips
        case .months(let months) where months < 12:
            return [.sleep, .solids, .teething, .milestones]
        case .months, .years:
            return [.tantrums, .pickyEating, .sleep, .talking]
        }
    }

    var label: LocalizedStringResource {
        switch self {
        case .cramping: .chatStarterCrampingLabel
        case .nausea: .chatStarterNauseaLabel
        case .foodsToAvoid: .chatStarterFoodsToAvoidLabel
        case .exercise: .chatStarterExerciseLabel
        case .backPain: .chatStarterBackPainLabel
        case .babyKicks: .chatStarterBabyKicksLabel
        case .sleepPositions: .chatStarterSleepPositionsLabel
        case .whatToEat: .chatStarterWhatToEatLabel
        case .contractions: .chatStarterContractionsLabel
        case .hospitalBag: .chatStarterHospitalBagLabel
        case .signsOfLabor: .chatStarterSignsOfLaborLabel
        case .sleep: .chatStarterSleepLabel
        case .feedingEnough: .chatStarterFeedingEnoughLabel
        case .crying: .chatStarterCryingLabel
        case .poop: .chatStarterPoopLabel
        case .cesareanRecovery: .chatStarterCesareanRecoveryLabel
        case .solids: .chatStarterSolidsLabel
        case .teething: .chatStarterTeethingLabel
        case .milestones: .chatStarterMilestonesLabel
        case .tantrums: .chatStarterTantrumsLabel
        case .pickyEating: .chatStarterPickyEatingLabel
        case .talking: .chatStarterTalkingLabel
        }
    }

    var question: LocalizedStringResource {
        switch self {
        case .cramping: .chatStarterCrampingQuestion
        case .nausea: .chatStarterNauseaQuestion
        case .foodsToAvoid: .chatStarterFoodsToAvoidQuestion
        case .exercise: .chatStarterExerciseQuestion
        case .backPain: .chatStarterBackPainQuestion
        case .babyKicks: .chatStarterBabyKicksQuestion
        case .sleepPositions: .chatStarterSleepPositionsQuestion
        case .whatToEat: .chatStarterWhatToEatQuestion
        case .contractions: .chatStarterContractionsQuestion
        case .hospitalBag: .chatStarterHospitalBagQuestion
        case .signsOfLabor: .chatStarterSignsOfLaborQuestion
        case .sleep: .chatStarterSleepQuestion
        case .feedingEnough: .chatStarterFeedingEnoughQuestion
        case .crying: .chatStarterCryingQuestion
        case .poop: .chatStarterPoopQuestion
        case .cesareanRecovery: .chatStarterCesareanRecoveryQuestion
        case .solids: .chatStarterSolidsQuestion
        case .teething: .chatStarterTeethingQuestion
        case .milestones: .chatStarterMilestonesQuestion
        case .tantrums: .chatStarterTantrumsQuestion
        case .pickyEating: .chatStarterPickyEatingQuestion
        case .talking: .chatStarterTalkingQuestion
        }
    }
}
