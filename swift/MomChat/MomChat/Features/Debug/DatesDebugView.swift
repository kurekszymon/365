#if DEBUG
import SwiftUI

/// Calculated stages for sample profiles, in English and Polish, plus the store's protection settings.
struct DatesDebugView: View {
    @State private var today = Date.now

    private let samples = DateSample.all(relativeTo: .now)
    private static let english = Locale(identifier: "en_US")
    private static let polish = Locale(identifier: "pl_PL")

    var body: some View {
        List {
            Section {
                DatePicker(String("Today"), selection: $today, displayedComponents: .date)
            } footer: {
                Text(verbatim: "Samples are fixed to the real date. Move \"Today\" to watch weeks and ages change.")
            }

            Section {
                ForEach(samples) { sample in
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text(verbatim: sample.title).font(Typography.body.bold())
                        Text(verbatim: describe(sample.child, locale: Self.english))
                        Text(verbatim: describe(sample.child, locale: Self.polish)).foregroundStyle(.secondary)
                    }
                    .font(Typography.caption)
                }
            } header: {
                Text(verbatim: "Samples")
            }

            StorageSection()
        }
        .navigationTitle(Text(verbatim: "Dates & storage"))
        .navigationBarTitleDisplayMode(.inline)
    }

    private func describe(_ child: Child, locale: Locale) -> String {
        if let progress = child.pregnancy(on: today) {
            return "\(DurationText.pregnancy(progress, locale: locale)) · T\(progress.trimester)"
        }
        guard let age = child.age(on: today) else {
            return child.stage == .archived ? "archived" : "–"
        }
        var text = DurationText.age(age, locale: locale)
        if let corrected = child.correctedAge(on: today) {
            let duration = DurationText.corrected(corrected, locale: locale)
            if case .age = corrected {
                text += " · corrected \(duration)"
            } else {
                text += " · \(duration) before due date"
            }
        }
        return text
    }
}

private struct DateSample: Identifiable {
    let id: String
    let title: String
    let child: Child

    static func all(relativeTo now: Date) -> [DateSample] {
        let calendar = Calendar.current
        func day(_ offset: Int) -> Date { calendar.date(byAdding: .day, value: offset, to: now)! }
        func month(_ offset: Int) -> Date { calendar.date(byAdding: .month, value: offset, to: now)! }

        let lastPeriod = day(-58)
        let emmaBirth = month(-7)
        return [
            DateSample(id: "lmp", title: "Expecting, from last period 58 days ago",
                       child: Child(stage: .expecting, dueDate: PregnancyDates.dueDate(lastPeriod: lastPeriod))),
            DateSample(id: "24w", title: "Expecting, due in 109 days",
                       child: Child(stage: .expecting, dueDate: day(109))),
            DateSample(id: "due", title: "Expecting, due tomorrow",
                       child: Child(stage: .expecting, dueDate: day(1))),
            DateSample(id: "lena", title: "Lena, 23 days old, born at 39 weeks",
                       child: Child(name: "Lena", stage: .born, dueDate: day(-16), birthDate: day(-23))),
            DateSample(id: "emma", title: "Emma, 7 months, born 4 weeks early",
                       child: Child(name: "Emma", stage: .born, dueDate: calendar.date(byAdding: .day, value: 28, to: emmaBirth)!, birthDate: emmaBirth)),
            DateSample(id: "preemie", title: "Born at 32 weeks, 10 days ago",
                       child: Child(stage: .born, dueDate: day(46), birthDate: day(-10))),
            DateSample(id: "leo", title: "Leo, 2 years 2 months",
                       child: Child(name: "Leo", stage: .born, birthDate: month(-26))),
            DateSample(id: "archived", title: "Archived pregnancy",
                       child: Child(stage: .archived, dueDate: day(60))),
        ]
    }
}

/// Read back from disk. The simulator doesn't enforce file protection, so check this on the phone.
private struct StorageSection: View {
    private let directory = DataStore.defaultDirectory

    var body: some View {
        Section {
            LabeledContent(String("Folder protection"), value: protection(of: directory))
            ForEach(files, id: \.self) { file in
                LabeledContent(file.lastPathComponent, value: protection(of: file))
            }
            LabeledContent(String("Excluded from backup"), value: excludedFromBackup ? "yes" : "no")
        } header: {
            Text(verbatim: "Storage")
        }
        .font(Typography.caption)
    }

    private var files: [URL] {
        (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? []
    }

    private var excludedFromBackup: Bool {
        (try? directory.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup) == true
    }

    private func protection(of url: URL) -> String {
        let attributes = try? FileManager.default.attributesOfItem(atPath: url.path(percentEncoded: false))
        return (attributes?[.protectionKey] as? FileProtectionType)?.rawValue ?? "unknown"
    }
}
#endif
