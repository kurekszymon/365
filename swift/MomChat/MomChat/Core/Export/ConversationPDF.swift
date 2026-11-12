import UIKit

/// Draws a `ConversationReport` as a paged PDF: header, profile, then the questions and answers,
/// with the on-device note and page number on every page.
///
/// Always light, fixed sizes: it's printed or read on a doctor's screen, not in the app.
enum ConversationPDF {
    enum PageSize {
        case a4, letter

        /// Letter where the phone uses US measurements, A4 everywhere else.
        static func current(_ locale: Locale = .current) -> PageSize {
            locale.measurementSystem == .us ? .letter : .a4
        }

        var rect: CGRect {
            switch self {
            case .a4: CGRect(x: 0, y: 0, width: 595.2, height: 841.8)
            case .letter: CGRect(x: 0, y: 0, width: 612, height: 792)
            }
        }
    }

    private enum Layout {
        static let side: CGFloat = 54
        static let top: CGFloat = 54
        /// Room for the footer under the text.
        static let bottom: CGFloat = 78
        static let footerGap: CGFloat = 24
        /// The profile's value column starts after the longest label, within these bounds.
        static let labelColumn: ClosedRange<CGFloat> = 100...210
    }

    private enum Ink {
        static let text = UIColor(red: 0.13, green: 0.12, blue: 0.13, alpha: 1)
        static let secondary = UIColor(red: 0.40, green: 0.38, blue: 0.40, alpha: 1)
        /// A darker take on the app's mauve, readable on white.
        static let accent = UIColor(red: 0.50, green: 0.30, blue: 0.38, alpha: 1)
        static let rule = UIColor(red: 0.87, green: 0.84, blue: 0.87, alpha: 1)
    }

    static func data(for report: ConversationReport, pageSize: PageSize = .current()) -> Data {
        let page = pageSize.rect
        let textSize = CGSize(width: page.width - 2 * Layout.side, height: page.height - Layout.top - Layout.bottom)

        let storage = NSTextStorage(attributedString: body(report))
        let layout = NSLayoutManager()
        storage.addLayoutManager(layout)

        // Add pages until every glyph has a place, so the total page count is known before drawing.
        var containers: [NSTextContainer] = []
        repeat {
            let container = NSTextContainer(size: textSize)
            container.lineFragmentPadding = 0
            layout.addTextContainer(container)
            containers.append(container)
            layout.ensureLayout(for: container)
        } while NSMaxRange(layout.glyphRange(for: containers.last!)) < layout.numberOfGlyphs && containers.count < 500

        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = [
            kCGPDFContextTitle as String: report.title,
            kCGPDFContextCreator as String: String(localized: .appName),
        ]
        let renderer = UIGraphicsPDFRenderer(bounds: page, format: format)
        return renderer.pdfData { context in
            for (index, container) in containers.enumerated() {
                context.beginPage()
                let origin = CGPoint(x: Layout.side, y: Layout.top)
                let glyphs = layout.glyphRange(for: container)
                layout.drawBackground(forGlyphRange: glyphs, at: origin)
                layout.drawGlyphs(forGlyphRange: glyphs, at: origin)
                drawFooter(report.footer, page: index + 1, of: containers.count, in: page)
            }
        }
    }

    // MARK: Body

    private static func body(_ report: ConversationReport) -> NSAttributedString {
        let text = NSMutableAttributedString()

        text.append(line(String(localized: .appName).uppercased(), font: .systemFont(ofSize: 9, weight: .semibold), color: Ink.accent, kern: 1.2, after: 6))
        text.append(line(report.title, font: .systemFont(ofSize: 20, weight: .semibold), color: Ink.text, after: 4))
        text.append(line(report.period, font: .systemFont(ofSize: 11), color: Ink.secondary, after: 6))

        let column = labelColumn(report.sections.flatMap(\.rows))
        for section in report.sections where !section.rows.isEmpty {
            text.append(heading(section.title))
            for row in section.rows {
                text.append(profileRow(row, column: column))
            }
        }

        if !report.entries.isEmpty {
            text.append(heading(String(localized: .exportPdfSectionConversation)))
            for entry in report.entries {
                text.append(self.entry(entry))
            }
        }
        return text
    }

    private static func heading(_ title: String) -> NSAttributedString {
        let style = NSMutableParagraphStyle()
        style.paragraphSpacingBefore = 18
        style.paragraphSpacing = 6
        return NSAttributedString(string: title + "\n", attributes: [
            .font: UIFont.systemFont(ofSize: 13, weight: .semibold),
            .foregroundColor: Ink.accent,
            .paragraphStyle: style,
        ])
    }

    /// "Label<tab>Value", the value wrapping in its own column.
    private static func profileRow(_ row: ConversationReport.Row, column: CGFloat) -> NSAttributedString {
        let style = NSMutableParagraphStyle()
        style.tabStops = [NSTextTab(textAlignment: .natural, location: column)]
        style.headIndent = column
        style.paragraphSpacing = 3
        let text = NSMutableAttributedString(string: row.label + "\t", attributes: [
            .font: rowFont,
            .foregroundColor: Ink.secondary,
            .paragraphStyle: style,
        ])
        text.append(NSAttributedString(string: row.value + "\n", attributes: [
            .font: rowFont,
            .foregroundColor: Ink.text,
            .paragraphStyle: style,
        ]))
        return text
    }

    private static func entry(_ entry: ConversationReport.Entry) -> NSAttributedString {
        let text = NSMutableAttributedString()
        switch entry.kind {
        case .day:
            let style = NSMutableParagraphStyle()
            style.alignment = .center
            style.paragraphSpacingBefore = 12
            style.paragraphSpacing = 4
            text.append(NSAttributedString(string: entry.time + "\n", attributes: [
                .font: UIFont.systemFont(ofSize: 10, weight: .semibold),
                .foregroundColor: Ink.secondary,
                .paragraphStyle: style,
            ]))

        case .question, .answer:
            let isQuestion = entry.kind == .question
            let label = String(localized: isQuestion ? .exportPdfQuestion : .exportPdfAnswer)
            text.append(line(
                [label, entry.time].filter { !$0.isEmpty }.joined(separator: " · "),
                font: .systemFont(ofSize: 9, weight: .semibold),
                color: isQuestion ? Ink.accent : Ink.secondary,
                before: isQuestion ? 12 : 6,
                after: 2
            ))
            let body = isQuestion
                ? NSAttributedString(string: entry.text.trimmingCharacters(in: .whitespacesAndNewlines))
                : markdown(entry.text.trimmingCharacters(in: .whitespacesAndNewlines))
            let font = UIFont.systemFont(ofSize: 11, weight: isQuestion ? .medium : .regular)
            text.append(styled(body, font: font, color: Ink.text, spacing: entry.footnote == nil ? 2 : 1))
            if let footnote = entry.footnote {
                text.append(line(footnote, font: .italicSystemFont(ofSize: 9.5), color: Ink.secondary, after: 2))
            }

        case .notice:
            text.append(line(entry.text, font: .italicSystemFont(ofSize: 10), color: Ink.secondary, before: 4, after: 2))
        }
        return text
    }

    private static let rowFont = UIFont.systemFont(ofSize: 10.5)

    private static func labelColumn(_ rows: [ConversationReport.Row]) -> CGFloat {
        let widest = rows.map { ($0.label as NSString).size(withAttributes: [.font: rowFont]).width }.max() ?? 0
        return min(max(ceil(widest) + 14, Layout.labelColumn.lowerBound), Layout.labelColumn.upperBound)
    }

    // MARK: Text helpers

    private static func line(_ string: String, font: UIFont, color: UIColor, kern: CGFloat = 0, before: CGFloat = 0, after: CGFloat = 0) -> NSAttributedString {
        let style = NSMutableParagraphStyle()
        style.paragraphSpacingBefore = before
        style.paragraphSpacing = after
        var attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color, .paragraphStyle: style]
        if kern != 0 { attributes[.kern] = kern }
        return NSAttributedString(string: string + "\n", attributes: attributes)
    }

    /// Applies the base font and color, keeping bold and italic from the Markdown.
    private static func styled(_ body: NSAttributedString, font: UIFont, color: UIColor, spacing: CGFloat) -> NSAttributedString {
        let text = NSMutableAttributedString(attributedString: body)
        text.append(NSAttributedString(string: "\n"))
        let style = NSMutableParagraphStyle()
        style.lineSpacing = 2
        style.paragraphSpacing = spacing
        let whole = NSRange(location: 0, length: text.length)
        text.addAttributes([.foregroundColor: color, .paragraphStyle: style], range: whole)

        text.enumerateAttribute(.inlinePresentationIntent, in: whole) { value, range, _ in
            let intent = (value as? NSNumber).map { InlinePresentationIntent(rawValue: $0.uintValue) } ?? []
            var traits: UIFontDescriptor.SymbolicTraits = []
            if intent.contains(.stronglyEmphasized) { traits.insert(.traitBold) }
            if intent.contains(.emphasized) { traits.insert(.traitItalic) }
            let descriptor = font.fontDescriptor.withSymbolicTraits(font.fontDescriptor.symbolicTraits.union(traits)) ?? font.fontDescriptor
            text.addAttribute(.font, value: traits.isEmpty ? font : UIFont(descriptor: descriptor, size: font.pointSize), range: range)
        }
        return text
    }

    /// The model writes light Markdown (**bold**, "- " bullets): bold is kept, line breaks stay as written.
    private static func markdown(_ string: String) -> NSAttributedString {
        guard let parsed = try? AttributedString(markdown: string, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)) else {
            return NSAttributedString(string: string)
        }
        return NSAttributedString(parsed)
    }

    private static func drawFooter(_ footer: String, page: Int, of pages: Int, in bounds: CGRect) {
        let y = bounds.height - Layout.bottom + Layout.footerGap
        let width = bounds.width - 2 * Layout.side

        let rule = UIBezierPath()
        rule.move(to: CGPoint(x: Layout.side, y: y - 8))
        rule.addLine(to: CGPoint(x: Layout.side + width, y: y - 8))
        Ink.rule.setStroke()
        rule.lineWidth = 0.5
        rule.stroke()

        let numberWidth: CGFloat = 70
        let small = UIFont.systemFont(ofSize: 8.5)
        NSAttributedString(string: footer, attributes: [.font: small, .foregroundColor: Ink.secondary])
            .draw(with: CGRect(x: Layout.side, y: y, width: width - numberWidth, height: 40), options: [.usesLineFragmentOrigin], context: nil)

        let right = NSMutableParagraphStyle()
        right.alignment = .right
        NSAttributedString(string: String(localized: .exportPdfPage(page, pages)), attributes: [.font: small, .foregroundColor: Ink.secondary, .paragraphStyle: right])
            .draw(with: CGRect(x: Layout.side + width - numberWidth, y: y, width: numberWidth, height: 20), options: [.usesLineFragmentOrigin], context: nil)
    }
}
