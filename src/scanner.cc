#include <cwctype>  // iswspace
#include <stdint.h> // uint8_t, int32_t
#include <tree_sitter/parser.h>
#include <vector>

namespace {

using std::vector;

enum TokenType {
  MULTSTR_START,
  MULTSTR_END,
  STR_START,
  STR_END,
  INTERPOLATION_START,
  INTERPOLATION_END,
  // We use a regular STR_END to close a quoted enum tag, so we just need a
  // start symbol
  QUOTED_ENUM_TAG_START,
  COMMENT,
};

// Zero is used, as an expected percent count, to represent the case where no
// interpolation is allowed. In this case, the string must be static and any
// sequence %..%{ should just be considered part of the string literal.
const uint8_t NO_INTERPOLATION = 0;

struct Scanner {
  // For every nested string we push the expected percent count to this vector.
  // When that string is terminated its expected percent count is popped from
  // this vector.
  vector<uint8_t> expected_percent_count;

  void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

  void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

  int32_t lookahead(TSLexer *lexer) { return lexer->lookahead; }

  unsigned serialize(char *buffer) {
    uint8_t i = 0;

    if (expected_percent_count.size() >
        TREE_SITTER_SERIALIZATION_BUFFER_SIZE - 1) {
      return 0;
    }

    // We serialize to and from uint8_t's, we cannot currently serialize any
    // value above that.
    if (expected_percent_count.size() > 255) {
      return 0;
    }

    buffer[i++] = expected_percent_count.size();
    for (uint8_t count : expected_percent_count) {
      buffer[i++] = count;
    }
    return i;
  }

  void deserialize(const char *buffer, uint8_t length) {
    // We have a constant size state, so this case should never happen. In case
    // it does, we initialize a fresh state.
    expected_percent_count.clear();
    if (length != 0) {
      uint8_t vec_length = buffer[0];

      expected_percent_count.clear();

      if (vec_length + 1 == length) {
        for (uint8_t i = 1; i < length; i++) {
          expected_percent_count.push_back(buffer[i]);
        }
      }
    }
  }

  // Scans the multistring start. Assumes that the m indicating a multistring
  // was already consumed.
  bool scan_multstr_start(TSLexer *lexer) {
    lexer->result_symbol = MULTSTR_START;
    uint8_t count = 0;
    bool quote = false;

    // Count the number of percentages
    while (lookahead(lexer) == '%') {
      count++;
      advance(lexer);
    }

    if (lookahead(lexer) == '"') {
      quote = true;
      advance(lexer);
    }

    expected_percent_count.push_back(count);

    // A START is fully scanned when we started with an 'm' (precondition of
    // this function), more than 0 percent signs (precondition of this
    // function), and a quote character.
    return quote;
  }

  // Scans the multistring end. Assumes that the " has already been consumed
  bool scan_multstr_end(TSLexer *lexer) {
    lexer->result_symbol = MULTSTR_END;
    bool m = false;

    uint8_t count = expected_percent_count.back();

    // Consume all %-signs
    // count should never be zero here, as we are lexing a multiline string.
    while (lookahead(lexer) == '%' && count > 0) {
      count--;
      advance(lexer);
    }

    if (lookahead(lexer) == 'm') {
      m = true;
      advance(lexer);
    }

    expected_percent_count.pop_back();

    // An END is fully scanned when we started with an '"' (precondition of
    // this function), consumed all %-signs and ended with an m.
    return (m && count == 0);
  }

  // Precondition of this function is that the lookahead is '"'
  bool scan_str_start(TSLexer *lexer) {
    lexer->result_symbol = STR_START;

    // Interpolation in strings are preceded by a single % sign.
    expected_percent_count.push_back(1);

    advance(lexer);

    return true;
  }

  // Precondition of this function is that the lookahead is '"'
  bool scan_str_end(TSLexer *lexer) {
    lexer->result_symbol = STR_END;

    advance(lexer);

    expected_percent_count.pop_back();

    return true;
  }

  bool scan_interpolation_start(TSLexer *lexer) {
    lexer->result_symbol = INTERPOLATION_START;

    bool brace = false;
    uint8_t count = expected_percent_count.back();

    // If count == NO_INTERPOLATION, interpolation is disallowed in the current string (used
    // for quoted enum tag, which must be static strings)
    if (count == NO_INTERPOLATION) {
      return false;
    }

    while (lookahead(lexer) == '%') {
      count--;
      advance(lexer);
    }

    if (lookahead(lexer) == '{') {
      brace = true;
      advance(lexer);
    }

    return brace && (count == 0);
  }

  // Precondition of this function is that the lookahead is '}'
  bool scan_interpolation_end(TSLexer *lexer) {
    lexer->result_symbol = INTERPOLATION_END;

    advance(lexer);

    return true;
  }

  // Precondition of this function is that the lookahead is '"'.
  bool scan_quoted_enum_tag_start(TSLexer *lexer) {
    lexer->result_symbol = QUOTED_ENUM_TAG_START;

    // zero is a special value meaning that no interpolation is allowed.
    expected_percent_count.push_back(NO_INTERPOLATION);

    advance(lexer);

    return true;
  }

  bool scan_comment(TSLexer *lexer) {
    lexer->result_symbol = COMMENT;

    // The length of the vector gives us the current level of nesting. Thus, an
    // empty vector implies that we are currently not in a string. For anything
    // else, we return false.
    if (!expected_percent_count.empty()) {
      return false;
    }

    // Consume the #
    advance(lexer);

    while (lookahead(lexer) != '\n' && lookahead(lexer) != '\0') {
      advance(lexer);
    }

    return true;
  }

  bool scan(TSLexer *lexer, const bool *valid_symbols) {
    // During error recovery we don't run the external scanner. This produces
    // less accurate results, but avoids a large deal of complexity in this
    // scanner.
    if (valid_symbols[MULTSTR_START] && valid_symbols[MULTSTR_END] &&
        valid_symbols[STR_START] && valid_symbols[STR_END] &&
        valid_symbols[INTERPOLATION_START] &&
        valid_symbols[INTERPOLATION_END] && valid_symbols[COMMENT]
        && valid_symbols[QUOTED_ENUM_TAG_START]) {
      return false;
    }

    // Skip over all whitespace
    while (iswspace(lookahead(lexer))) {
      skip(lexer);
    }

    switch (lookahead(lexer)) {
    case 'm':
      if (valid_symbols[MULTSTR_START]) {
        advance(lexer);
        if (lookahead(lexer) == '%') {
          return scan_multstr_start(lexer);
        }
      }
      break;
    case '"':
      if (valid_symbols[MULTSTR_END]) {
        advance(lexer);
        if (lookahead(lexer) == '%') {
          return scan_multstr_end(lexer);
        }
      } else if (valid_symbols[STR_START]) {
        return scan_str_start(lexer);
      } else if (valid_symbols[STR_END]) {
        return scan_str_end(lexer);
      }
      break;
    case '%':
      if (valid_symbols[INTERPOLATION_START]) {
        return scan_interpolation_start(lexer);
      }
      break;
    case '}':
      if (valid_symbols[INTERPOLATION_END]) {
        return scan_interpolation_end(lexer);
      }
      break;
    case '`':
      if (valid_symbols[QUOTED_ENUM_TAG_START]) {
        advance(lexer);
        if (lookahead(lexer) == '"') {
            return scan_quoted_enum_tag_start(lexer);
        }
      }
      break;
    case '#':
      if (valid_symbols[COMMENT]) {
        return scan_comment(lexer);
      }
      break;
    }

    return false;
  }
};

} // namespace

extern "C" {

void *tree_sitter_nickel_external_scanner_create() { return new Scanner(); }

bool tree_sitter_nickel_external_scanner_scan(void *payload, TSLexer *lexer,
                                              const bool *valid_symbols) {
  Scanner *scanner = static_cast<Scanner *>(payload);
  return scanner->scan(lexer, valid_symbols);
}

/**
 * @param Contains the scanner
 * @param Will hold the serialized state of the scanner
 */
unsigned tree_sitter_nickel_external_scanner_serialize(void *payload,
                                                       char *buffer) {
  Scanner *scanner = static_cast<Scanner *>(payload);
  return scanner->serialize(buffer);
}

/**
 * @param Contains the scanner
 * @param The serialised state of the scanner
 * @param Indicates the length of the buffer
 */
void tree_sitter_nickel_external_scanner_deserialize(void *payload,
                                                     const char *buffer,
                                                     unsigned length) {
  Scanner *scanner = static_cast<Scanner *>(payload);
  uint8_t length_uint8 = (uint8_t)length;
  scanner->deserialize(buffer, length_uint8);
}

void tree_sitter_nickel_external_scanner_destroy(void *payload) {
  Scanner *scanner = static_cast<Scanner *>(payload);
  delete scanner;
}
}
