import XCTest

@MainActor final class Stage5Throwaway: XCTestCase {
    let app = XCUIApplication()

    func shot(_ name: String) {
        let a = XCTAttachment(screenshot: app.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a)
    }

    func tapContaining(_ text: String, _ query: XCUIElementQuery, timeout: Double = 5) {
        let e = query.containing(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
        let el = e.exists ? e : query.matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
        XCTAssertTrue(el.waitForExistence(timeout: timeout), "missing \(text)")
        el.tap()
    }

    @MainActor func testStage5() throws {
        continueAfterFailure = false
        app.launch()
        app.buttons["Get started"].tap()
        if app.buttons["Skip (debug)"].waitForExistence(timeout: 2) { app.buttons["Skip (debug)"].tap() }
        tapContaining("My baby is here", app.buttons)
        let name = app.textFields["Name"]; name.tap(); name.typeText("Emma\n")
        app.buttons["Continue"].tap()
        app.buttons["Start asking"].tap()

        let title = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Emma'")).firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: 5)); shot("1-chat-emma")
        title.tap()
        XCTAssertTrue(app.navigationBars["Profiles"].waitForExistence(timeout: 5)); shot("2-profiles")
        app.buttons["Add a baby or pregnancy"].tap()
        tapContaining("A new pregnancy", app.buttons); shot("3-add-pregnancy")
        app.buttons["Add"].tap()

        let week = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Week 20'")).firstMatch
        XCTAssertTrue(week.waitForExistence(timeout: 5)); shot("4-chat-week20")
        week.tap()
        XCTAssertTrue(app.navigationBars["Profiles"].waitForExistence(timeout: 5)); shot("5-profiles-two")
        app.buttons.matching(identifier: "Edit profile").element(boundBy: 1).tap()
        XCTAssertTrue(app.staticTexts["Due date"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["My baby has arrived"].exists, "birth button before 22 weeks")
        shot("6-pregnancy-edit-20w")
        app.buttons["Date Picker"].firstMatch.tap()
        for _ in 0..<4 { app.buttons["Previous Month"].tap() }
        let firstNov = app.buttons.matching(NSPredicate(format: "label == 'Sunday, November 1'")).firstMatch
        XCTAssertTrue(firstNov.waitForExistence(timeout: 3)); firstNov.tap()
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.1)).tap()
        XCTAssertTrue(app.buttons["My baby has arrived"].waitForExistence(timeout: 5)); shot("7-pregnancy-edit-39w")
        app.navigationBars.buttons["BackButton"].tap()
        app.buttons["Done"].tap()

        let banner = app.buttons["Yes, they're here!"]
        XCTAssertTrue(banner.waitForExistence(timeout: 5)); shot("8-chat-banner")
        banner.tap()
        XCTAssertTrue(app.buttons["Save"].waitForExistence(timeout: 5)); shot("9-birth-form")
        app.buttons["Save"].tap()
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label CONTAINS 'Baby · born today'")).firstMatch.waitForExistence(timeout: 5))
        XCTAssertFalse(banner.exists); shot("10-chat-baby")

        app.buttons["Settings"].tap()
        app.buttons["Profiles"].tap()
        app.buttons["Add a baby or pregnancy"].tap()
        tapContaining("A new pregnancy", app.buttons)
        app.buttons["Add"].tap()
        XCTAssertTrue(app.navigationBars["Profiles"].waitForExistence(timeout: 5))
        app.buttons.matching(identifier: "Edit profile").element(boundBy: 2).tap()
        app.swipeUp()
        app.buttons["End this pregnancy"].tap(); shot("11-end-confirm")
        app.buttons["End pregnancy"].tap()
        XCTAssertTrue(app.buttons["Restore pregnancy"].waitForExistence(timeout: 5)); shot("12-archived")
        app.navigationBars.buttons["BackButton"].tap()
        XCTAssertTrue(app.staticTexts["ARCHIVED"].exists || app.staticTexts["Archived"].exists); shot("13-profiles-archived")
        tapContaining("Pregnancy", app.buttons)
        app.buttons["Restore pregnancy"].tap()
        app.navigationBars.buttons["BackButton"].tap()
        XCTAssertFalse(app.staticTexts["Archived"].exists); shot("14-restored")
    }
}
