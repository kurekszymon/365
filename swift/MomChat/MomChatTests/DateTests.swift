import Foundation
import Testing
@testable import MomChat

/// Fixed calendar and time zone so results don't depend on the machine running the tests.
private let calendar: Calendar = {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "Europe/Warsaw")!
    return calendar
}()

private func date(_ text: String, hour: Int = 0) -> Date {
    let parts = text.split(separator: "-").map { Int($0)! }
    return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: hour))!
}

private let english = Locale(identifier: "en_US")
private let polish = Locale(identifier: "pl_PL")

struct PregnancyDateTests {
    @Test func dueDateIs280DaysAfterLastPeriod() {
        #expect(PregnancyDates.dueDate(lastPeriod: date("2026-01-01"), calendar: calendar) == date("2026-10-08"))
    }

    @Test func dueDateCountsLeapDay() {
        // 2027-12-01 + 280 days crosses 2028-02-29.
        #expect(PregnancyDates.dueDate(lastPeriod: date("2027-12-01"), calendar: calendar) == date("2028-09-06"))
    }

    @Test func dueDateIgnoresTimeOfDay() {
        #expect(PregnancyDates.dueDate(lastPeriod: date("2026-01-01", hour: 23), calendar: calendar) == date("2026-10-08"))
    }

    @Test func weekAndDayFromDueDate() throws {
        let progress = try #require(PregnancyDates.progress(dueDate: date("2027-01-30"), on: date("2026-10-13"), calendar: calendar))
        #expect(progress.weeks == 24)
        #expect(progress.days == 3)
        #expect(progress.trimester == 2)
    }

    @Test func dstChangeDoesNotShiftTheDay() throws {
        // Clocks go back in Poland on 2026-10-25.
        let progress = try #require(PregnancyDates.progress(dueDate: date("2027-01-30"), on: date("2026-10-26", hour: 1), calendar: calendar))
        #expect(progress.totalDays == 24 * 7 + 3 + 13)
    }

    @Test(arguments: [(13 * 7 + 6, 1), (14 * 7, 2), (27 * 7 + 6, 2), (28 * 7, 3), (41 * 7, 3)])
    func trimesterBoundaries(totalDays: Int, trimester: Int) {
        #expect(PregnancyProgress(totalDays: totalDays).trimester == trimester)
    }

    @Test func lastPeriodDayIsWeekZero() {
        #expect(PregnancyDates.progress(dueDate: date("2026-10-08"), on: date("2026-01-01"), calendar: calendar) == PregnancyProgress(totalDays: 0))
        #expect(PregnancyDates.progress(dueDate: date("2026-10-08"), on: date("2025-12-31"), calendar: calendar) == nil)
    }

    @Test func overdueKeepsCounting() {
        #expect(PregnancyDates.progress(dueDate: date("2026-10-08"), on: date("2026-10-15"), calendar: calendar)?.weeks == 41)
    }
}

struct ChildAgeTests {
    private func age(_ birth: String, _ today: String) -> ChildAge? {
        ChildAge.between(date(birth), and: date(today), calendar: calendar)
    }

    @Test func unitsGrowWithTheChild() {
        #expect(age("2026-10-28", "2026-10-28") == .days(0))
        #expect(age("2026-10-27", "2026-10-28") == .days(1))
        #expect(age("2026-10-15", "2026-10-28") == .days(13))
        #expect(age("2026-10-14", "2026-10-28") == .weeks(2, days: 0))
        #expect(age("2026-09-13", "2026-10-28") == .weeks(6, days: 3))
        #expect(age("2026-07-29", "2026-10-28") == .weeks(13, days: 0))  // 2 months 30 days: still weeks
        #expect(age("2026-07-28", "2026-10-28") == .months(3))
        #expect(age("2026-03-20", "2026-10-28") == .months(7))
        #expect(age("2024-10-29", "2026-10-28") == .months(23))
        #expect(age("2024-10-28", "2026-10-28") == .years(2, months: 0))
        #expect(age("2024-08-15", "2026-10-28") == .years(2, months: 2))
    }

    @Test func birthTimeDoesNotMatter() {
        #expect(ChildAge.between(date("2026-10-27", hour: 23), and: date("2026-10-28", hour: 1), calendar: calendar) == .days(1))
    }

    @Test func leapDayBirthday() {
        // Born 2028-02-29: two years old on 2030-02-28, and 23 months the day before.
        #expect(age("2028-02-29", "2030-02-27") == .months(23))
        #expect(age("2028-02-29", "2030-02-28") == .years(2, months: 0))
        #expect(age("2028-02-29", "2030-03-01") == .years(2, months: 0))
    }

    @Test func notBornYet() {
        #expect(age("2026-10-29", "2026-10-28") == nil)
    }
}

struct CorrectedAgeTests {
    private func corrected(born: String, due: String, today: String) -> CorrectedAge? {
        CorrectedAge.between(birthDate: date(born), dueDate: date(due), and: date(today), calendar: calendar)
    }

    @Test func pretermBabyGetsCorrectedAge() {
        // Born 4 weeks early (36w0d), 7 months old.
        #expect(corrected(born: "2026-03-28", due: "2026-04-25", today: "2026-10-28") == .age(.months(6)))
    }

    @Test func bornAtExactly37WeeksIsNotCorrected() {
        // 37w0d is term, not preterm: no correction.
        #expect(corrected(born: "2026-04-04", due: "2026-04-25", today: "2026-10-28") == nil)
        // 36w6d is preterm.
        #expect(corrected(born: "2026-04-03", due: "2026-04-25", today: "2026-10-28") != nil)
    }

    @Test func beforeDueDateCountsDaysToGo() {
        // Born at 32 weeks, 10 days old: still 46 days before the due date.
        #expect(corrected(born: "2026-10-18", due: "2026-12-13", today: "2026-10-28") == .beforeDueDate(days: 46))
        #expect(corrected(born: "2026-10-18", due: "2026-12-13", today: "2026-12-13") == .age(.days(0)))
    }

    @Test func switchesOffAtTwoYears() {
        #expect(corrected(born: "2024-10-29", due: "2024-12-24", today: "2026-10-28") == .age(.months(22)))
        #expect(corrected(born: "2024-10-28", due: "2024-12-23", today: "2026-10-28") == nil)
    }

    @Test func childModelOnlyCountsInItsStage() {
        let child = Child(stage: .expecting, dueDate: date("2027-01-30"))
        #expect(child.pregnancy(on: date("2026-10-14"), calendar: calendar)?.weeks == 24)
        #expect(child.age(on: date("2026-10-14"), calendar: calendar) == nil)

        child.stage = .archived
        #expect(child.pregnancy(on: date("2026-10-14"), calendar: calendar) == nil)

        child.stage = .born
        child.birthDate = date("2026-10-28")
        #expect(child.age(on: date("2026-10-29"), calendar: calendar) == .days(1))
        #expect(child.correctedAge(on: date("2026-10-29"), calendar: calendar) == .beforeDueDate(days: 93))
    }
}

struct DurationTextTests {
    @Test func englishMatchesThePromptStyle() {
        #expect(DurationText.pregnancy(PregnancyProgress(totalDays: 24 * 7 + 3), locale: english) == "24 weeks 3 days")
        #expect(DurationText.pregnancy(PregnancyProgress(totalDays: 8 * 7), locale: english) == "8 weeks")
        #expect(DurationText.pregnancy(PregnancyProgress(totalDays: 5), locale: english) == "0 weeks 5 days")
        #expect(DurationText.age(.days(1), locale: english) == "1 day")
        #expect(DurationText.age(.weeks(6, days: 3), locale: english) == "6 weeks 3 days")
        #expect(DurationText.age(.months(7), locale: english) == "7 months")
        #expect(DurationText.age(.years(2, months: 2), locale: english) == "2 years 2 months")
        #expect(DurationText.age(.years(2, months: 0), locale: english) == "2 years")
        #expect(DurationText.corrected(.beforeDueDate(days: 46), locale: english) == "6 weeks 4 days")
    }

    @Test(arguments: [
        (1, "1 tydzień"), (2, "2 tygodnie"), (4, "4 tygodnie"), (5, "5 tygodni"),
        (12, "12 tygodni"), (21, "21 tygodni"), (22, "22 tygodnie"), (25, "25 tygodni"),
    ])
    func polishWeekPlurals(weeks: Int, expected: String) {
        #expect(DurationText.pregnancy(PregnancyProgress(totalDays: weeks * 7), locale: polish) == expected)
    }

    @Test func polishPluralsForEveryUnit() {
        #expect(DurationText.age(.days(1), locale: polish) == "1 dzień")
        #expect(DurationText.age(.days(5), locale: polish) == "5 dni")
        #expect(DurationText.age(.weeks(6, days: 3), locale: polish) == "6 tygodni 3 dni")
        #expect(DurationText.age(.months(1), locale: polish) == "1 miesiąc")
        #expect(DurationText.age(.months(3), locale: polish) == "3 miesiące")
        #expect(DurationText.age(.months(7), locale: polish) == "7 miesięcy")
        #expect(DurationText.age(.months(22), locale: polish) == "22 miesiące")
        #expect(DurationText.age(.years(2, months: 2), locale: polish) == "2 lata 2 miesiące")
        #expect(DurationText.pregnancy(PregnancyProgress(totalDays: 24 * 7 + 3), locale: polish) == "24 tygodnie 3 dni")
    }
}
