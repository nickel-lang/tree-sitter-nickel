import XCTest
import SwiftTreeSitter
import TreeSitterNickel

final class TreeSitterNickelTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_nickel())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Nickel grammar")
    }
}
