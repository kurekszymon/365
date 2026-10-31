import SwiftData
import SwiftUI

/// The mom and her children. Tapping a child points the chat at it, the info button edits it.
/// Opened from the chat title and from Settings.
struct ProfilesView: View {
    /// From the chat title: picking or adding a child goes straight back to the chat.
    var dismissesOnSelect = false

    @Query private var moms: [MomProfile]
    @Query(sort: \Child.createdAt) private var children: [Child]
    @State private var editing: Child?
    @State private var isAdding = false

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List {
            if let mom {
                Section {
                    NavigationLink {
                        MomEditView(mom: mom)
                    } label: {
                        Label {
                            Text(verbatim: mom.name ?? String(localized: .profilesMomRow))
                                .foregroundStyle(Palette.textPrimary)
                        } icon: {
                            Image(systemName: "person.crop.circle")
                                .foregroundStyle(Palette.accent)
                        }
                    }
                } header: {
                    Text(.profilesSectionYou)
                }
            }

            Section {
                ForEach(current) { child in
                    row(child)
                }
                Button {
                    isAdding = true
                } label: {
                    Label {
                        Text(.profilesAdd)
                    } icon: {
                        Image(systemName: "plus.circle.fill")
                    }
                }
            } header: {
                Text(.profilesSectionChildren)
            } footer: {
                Text(.profilesFooter)
            }

            if !archived.isEmpty {
                Section {
                    ForEach(archived) { child in
                        NavigationLink {
                            ChildEditView(child: child)
                        } label: {
                            summary(child)
                        }
                    }
                } header: {
                    Text(.profilesSectionArchived)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Palette.background)
        .navigationTitle(Text(.profilesTitle))
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(item: $editing) { child in
            ChildEditView(child: child)
        }
        .sheet(isPresented: $isAdding) {
            AddChildView {
                if dismissesOnSelect { dismiss() }
            }
        }
    }

    private var mom: MomProfile? { moms.first }

    private var current: [Child] { children.filter { $0.stage != .archived } }

    private var archived: [Child] { children.filter { $0.stage == .archived } }

    private func row(_ child: Child) -> some View {
        let isActive = mom?.activeChild === child
        return HStack {
            Button {
                mom?.activeChild = child
                if dismissesOnSelect { dismiss() }
            } label: {
                HStack {
                    summary(child)
                    Spacer()
                    if isActive {
                        Image(systemName: "checkmark")
                            .foregroundStyle(Palette.accent)
                    }
                }
                .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(isActive ? .isSelected : [])

            Button {
                editing = child
            } label: {
                Image(systemName: "info.circle")
                    .foregroundStyle(Palette.accent)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel(Text(.profilesEdit))
        }
    }

    private func summary(_ child: Child) -> some View {
        let summary = ProfileSummary(child: child)
        return VStack(alignment: .leading, spacing: Spacing.xs) {
            Text(verbatim: summary.title)
                .foregroundStyle(Palette.textPrimary)
            Text(verbatim: summary.subtitle)
                .font(Typography.caption)
                .foregroundStyle(Palette.textSecondary)
        }
    }
}

/// One line on the profiles screen: "Pregnancy" / "Week 24 · due 12 January", "Emma" / "7 months".
struct ProfileSummary: Equatable {
    let title: String
    let subtitle: String

    init(child: Child, on date: Date = .now, calendar: Calendar = .current, locale: Locale = .current) {
        let due = child.dueDate?.formatted(date: .long, time: .omitted) ?? ""
        switch child.stage {
        case .expecting, .archived:
            title = child.name ?? (child.multiples > 1
                ? String(localized: .profilesRowPregnancyMultiples(child.multiples))
                : String(localized: .profilesRowPregnancy))
            if let progress = child.pregnancy(on: date, calendar: calendar) {
                subtitle = String(localized: .profilesRowWeek(progress.weeks, due))
            } else {
                subtitle = String(localized: .profilesRowDue(due))
            }
        case .born:
            title = child.name ?? String(localized: .childDefaultName)
            if let age = child.age(on: date, calendar: calendar) {
                subtitle = age == .days(0) ? String(localized: .profilesRowBornToday) : DurationText.age(age, locale: locale)
            } else {
                subtitle = ""
            }
        }
    }
}

#Preview {
    NavigationStack {
        ProfilesView()
    }
    .modelContainer(try! DataStore.makeInMemoryContainer())
}
