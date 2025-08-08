// NOTE[builtin] Nickel lexes all builtin functions in lexer.rs. This is
// possible for use, but we can also choose to parse them in the parser
// instead. This prevents the grammar from having to be updated when a new
// builtin function is added. Additionally, it keeps the grammar smaller. You
// will not see rules in this grammar that match on all builtin function
// seperately.

// NOTE[typerule] In the lalrpop grammar there is a FixedType rule that is just
// a Types rule, but with post-processing. We don't do any post-processing in
// tree-sitter, so we just parse them as a `Types`.

// NOTE[special-infix] The lalrpop grammer produces an AST. In tree-sitter we
// don't have to do this. Hence, we don't have to treat the "|>" and "!="
// operators differently from others. This means we can unify them with the
// other _b_op rules.

// NOTE[scanner] The Nickel scanner is a modal one, this parser and grammar
// takes a different approach. Several special characters that may occur in
// strings (", %, #) are scanned in src/scanner.c. In particular for % we have
// to take a strange approach. Scanners in tree-sitter may only produce a
// single token and may not look ahead. So, when scanning %-signs in multiline
// strings, we always attempt to scan the end of the multistring. If that
// fails, we abort, and parse a single %-sign. This requires several changes in
// the grammar (compared to the lalrpop grammar). For instance we static
// strings may consist of multiple chunks, and interpolation and string chunks
// do not strictly alternate.

module.exports = grammar({
  name: 'nickel',

  extras: $ => [
    /\s/,
    $.comment,
  ],

  supertypes: _ => [
  ],

  inline: _ => [
  ],

  externals: $ => [
    $.multstr_start,
    $.multstr_end,
    $._str_start,
    $._str_end,
    $.interpolation_start,
    $.interpolation_end,
    $.quoted_enum_tag_start,
    $.comment,
  ],

  word: $ => $.keyword,

  rules: {
    term: $ => $.uni_term,

    ////////////////////////////
    // LEXER RELATED RULES (lexer.rs)
    ////////////////////////////
    keyword: _ => token(/if|then|else|forall|in|let|rec|match|null|true|false|fun|import|merge|default|doc|force|optional|priority|not_exported/),

    num_literal: _ => /([0-9]*\.?[0-9]+([eE][+\-]?[0-9]+)?)|0((b[01]+)|(o[0-7]+)|(x[0-9a-fA-F]+))/,

    signed_num_literal: _ => /-?(([0-9]*\.?[0-9]+([eE][+\-]?[0-9]+)?)|0((b[01]+)|(o[0-7]+)|(x[0-9a-fA-F]+)))/,

    // **IMPORTANT**
    // This regex should be kept in sync with the one for raw_enum_tag below.
    ident: _ => /_*[a-zA-Z][_a-zA-Z0-9-']*/,

    // Standard, unquoted enum tag.
    // **IMPORTANT**
    // This regex should be kept in sync with the one for identifier above.
    raw_enum_tag: _ => /'_*[a-zA-Z][_a-zA-Z0-9-']*/,

    ////////////////////////////
    // PARSER RULES (grammar.lalrpop)
    ////////////////////////////

    //grammar.lalrpop: 94
    // In the lalrpop grammar this (and the annot)-rule(s) are parameterized.
    // See NOTE[typerule].
    annot_atom: $ => choice(
      seq("|", field("ty", $.types)),
      seq("|", "default"),
      seq("|", "force"),
      seq("|", "optional"),
      seq("|", "priority", field("priority", $.signed_num_literal)),
      seq("|", "doc", field("doc", $.static_string)),
      seq("|", "rec", "force"),
      seq("|", "rec", "default"),
      seq("|", "not_exported"),
      seq(":", field("ty", $.types)),
    ),

    //grammar.lalrpop: 126
    // See NOTE[typerule].
    annot: $ => field("anns", repeat1($.annot_atom)),

    //grammar.lalrpop: 133
    types: $ => choice(
      $.infix_expr,
      $.forall,
    ),

    //grammar.lalrpop: 165
    uni_term: $ => choice(
      $.infix_expr,
      // NOTE: We seperate the rules out into their own, otherwise it would get
      // a little much for this single rule.
      $.annotated_infix_expr,
      $.forall,
      $.let_expr,
      $.fun_expr,
      $.ite_expr, // if then else
    ),

    let_expr: $ => seq(
      field("binding", $.let_in_block),
      field("t2", $.term),
    ),

    let_binding: $ => seq(
      field("pat", $.pattern),
      field("meta", optional($.annot)),
      "=",
      field("t1", $.term),
    ),

    let_in_block: $ => seq(
      "let",
      optional("rec"),
      field("bindings", seq(commaSep($.let_binding), optional(","))),
      "in",
    ),

    fun_expr: $ => seq(
      "fun",
      field("pats", repeat1($.pattern_fun)),
      "=>",
      field("t", $.term),
    ),

    match_expr: $ => seq(
      "match",
      "{",
      field("cases", seq(commaSep($.match_branch), optional(","))),
      "}",
    ),

    ite_expr: $ => seq(
      "if",
      field("cond", $.term),
      "then",
      field("t1", $.term),
      "else",
      field("t2", $.term),
    ),

    //grammar.lalrpop: 224
    annotated_infix_expr: $ => seq(
      field("t", $.infix_expr),
      field("meta", $.annot),
    ),

    //grammar.lalrpop: 232
    forall: $ => seq(
      "forall",
      field("ids", repeat1($.ident)),
      ".",
      field("ty", $.types),
    ),

    //grammar.lalrpop: 242
    applicative: $ => choice(
      seq("import", field("s", $.static_string)),
      $.type_array,
      // To avoid ambiguity with vanilla function application, we use
      // precedence, while the original LALRPOP grammar does things a bit
      // differently (see the `enum_variant` rule for more details).
      $.enum_variant,
      seq(field("t1", $.applicative), field("t2", $.record_operand)),
      // We don't explicitly have the following three rules. Instead we
      // match generically on builtin functions.
      // This is different from the lalrpop grammar. See NOTE[builtin].
      //seq($.u_op, $.record_operand),
      //seq($.b_op_pre, $.record_operand, $.atom),
      //seq($.n_op_pre),
      $.match_expr,
      $.record_operand,
    ),

    //grammar.lalrpop: 255
    type_array: $ => seq("Array", $.record_operand),

    //grammar.lalrpop: 258
    record_operand: $ => choice(
      $.atom,
      $.record_operation_chain,
    ),

    //grammar.lalrpop: 264
    record_operation_chain: $ => choice(
      seq(field("t", $.record_operand), ".", field("id", $.ident)),
      seq(field("t", $.record_operand), ".", field("t_id", $.str_chunks)),
    ),

    //grammar.lalrpop: 269
    row_tail: $ => choice(
      $.ident,
      "Dyn",
    ),

    //grammar.lalrpop: 276
    uni_record: $ => seq(
      "{",
      field("fields", repeat(seq($.field_decl, ","))),
      field("last", optional($.last_field)),
      field("tail", optional(seq(";", $.row_tail))),
      "}",
    ),

    //grammar.lalrpop: 306
    atom: $ => choice(
      parens($.curried_op),
      parens($.uni_term),
      $.num_literal,
      "null",
      $.bool,
      $.str_chunks,
      $.ident,
      // DIFFERENT from lalrpop grammar. See NOTE[builtin].
      $.builtin,
      $.uni_record,
      $.enum_tag,
      list($.term, "terms"),
      $.type_atom,
    ),

    //grammar.lalrpop: 328
    field_def: $ => seq(
      field("path", $.field_path),
      field("ann", optional($.annot)),
      field("t", optional(seq("=", $.term))),
    ),

    record_include: $ => seq(
      "include",
      field("id", $.ident),
      field("ann", optional($.annot)),
    ),

    record_include_list: $ => seq(
      "include",
      list($.ident, "ids"),
    ),

    field_decl:$ => choice(
      $.field_def,
      $.record_include,
      $.record_include_list,
    ),

    //grammar.lalrpop: 348
    last_field: $ => choice(
      $.field_decl,
      "..",
    ),

    // No field since we only have one child here
    field_path: $ => sep1($.field_path_elem, "."),

    field_path_elem: $ => choice(
      $.ident,
      $.str_chunks,
    ),

    last_field_pat: $ => choice(
      $.field_pattern,
      seq("..", optional($.ident)),
    ),

    last_elem_pat: $ => choice(
      $.pattern,
      seq("..", optional($.ident)),
    ),

    // Patterns
    //
    // The LALRPOP grammar use macros to derive various flavors of patterns and
    // their constituent parts, around parenthesization and parsing or-patterns.
    //
    // We mirror the LALRPOP grammar by adding parametric rules with the `F`
    // suffix and with the following possible values for the parameter.
    //
    // The tree-sitter grammar doesn't currently correctly handle the `or`
    // keyword used as an identifier in a pattern. This requires to either
    // update the scanner or to play with token precedence, with is left for
    // future work.
    pattern: $ => patternF($, $.enum_pattern, $.or_pattern),
    pattern_fun: $ => patternF($, $.enum_pattern_parens, $.or_pattern_parens),
    pattern_or_branch: $ => pattern_dataF($, $.enum_pattern_parens, $.or_pattern_parens),

    constant_pattern: $ => choice(
      $.signed_num_literal,
      $.bool,
      $.static_string,
      "null",
    ),

    record_pattern: $ => seq(
      "{",
      field("patterns", repeat(seq($.field_pattern, ","))),
      field("last", optional($.last_field_pat)),
      "}",
    ),

    array_pattern: $ => seq(
      "[",
      field("patterns", repeat(seq($.pattern, ","))),
      field("last", optional($.last_elem_pat)),
      "]",
    ),

    field_pattern: $ => seq(
      field("id", $.ident),
      field("anns", optional($.annot)),
      field("default", optional($.default_annot)),
      field("pat", optional(seq("=", $.pattern))),
    ),

    enum_variant_pattern: $ => seq(
      field("tag", $.enum_tag),
      field("pat", $.pattern_fun),
    ),

    enum_pattern_unparens: $ => choice(
      $.enum_tag,
      $.enum_variant_pattern,
    ),

    enum_pattern_parens: $ => choice(
      $.enum_tag,
      parens($.enum_variant_pattern),
    ),

    enum_pattern: $ => choice(
      $.enum_tag,
      $.enum_variant_pattern,
      parens($.enum_variant_pattern),
    ),

    or_pattern_unparens: $ => seq(
      field("patterns", repeat1(seq($.pattern_or_branch, "or"))),
      field("last", $.pattern_or_branch),
    ),

    or_pattern_parens: $ => parens($.or_pattern_unparens),

    or_pattern: $ => choice(
      $.or_pattern_unparens,
      $.or_pattern_parens,
    ),

    //grammar.lalrpop: 428
    default_annot: $ => seq(
      "?",
      field("t", $.term),
    ),

    //grammar.lalrpop: 437
    bool: _ => choice(
      "true",
      "false",
    ),

    //grammar.lalrpop: 443
    // Different from lalrpop grammar since we cannot assert. Instead split up
    // into two rules
    str_chunks: $ => choice(
      $.str_chunks_single,
      $.str_chunks_multi,
    ),

    str_chunks_single: $ => seq(
      $._str_start,
      field("chunks", repeat(choice(
        $.chunk_expr,
        $.chunk_literal_single,
      ))),
      $._str_end,
    ),

    str_chunks_multi: $ => seq(
      field("start", $.multstr_start),
      field("chunks", repeat(choice(
        $.chunk_expr,
        $.chunk_literal_multi,
      ))),
      field("end", $.multstr_end),
    ),

    //grammar.lalrpop: 480
    //NOTE: Because we cannot parameterize grammar rules, we instead create two
    //versions. `chunk_literal_single` and `chunk_literal_multi`.
    //chunk_literal: $ => repeat1($.chunk_literal_part),

    //grammar.lalrpop: 492
    //Field names not from lalrpop grammar
    chunk_expr: $ => seq(
      field("start", $.interpolation_start),
      field("t", $.term),
      field("end", $.interpolation_end),
    ),

    //grammar.lalrpop: 492
    //NOTE: We deal with this in the lexer.
    //interpolation: $ => choice(
    //  $._interpolation_start,
    //  $.multstr_start,
    //),

    //grammar.lalrpop: 496
    //Field names differ from lalrpop grammar.
    //See NOTE[scanner].
    static_string: $ => choice(
      // "Single line"
      seq($._str_start, repeat($.chunk_literal_single), $._str_end),
      // m%"Multi line"%m
      seq($.multstr_start, repeat($.chunk_literal_multi), $.multstr_end),
    ),

    // grammar.lalrpop (c30ad1fc6cf43a450126b3c9dd4bbe68d53ca3b2): L55
    // An enum tag escaped with double quotes, like `"enum$tag$with$spec$chars"
    quoted_enum_tag: $ =>
      seq($.quoted_enum_tag_start, repeat($.chunk_literal_single), $._str_end),

    //grammar.lalrpop: 498
    enum_tag: $ => choice(
      $.raw_enum_tag,
      $.quoted_enum_tag,
    ),

    // There's no enum_variant rule in the original grammar: an enum variant is
    // parsed as an enum tag applied (as a function) to an argument, and this
    // special case is then matched on in the action code. We don't have actions
    // in tree-sitter (we don't build the AST explicitly), and for highlighting
    // and formatting purpose, it's better to have a dedicated rule for enum
    // variants.
    enum_variant: $ => prec(1, seq(
      field("tag", $.enum_tag),
      field("arg", $.record_operand),
    )),

    enum: $ => choice(
      $.enum_tag,
      $.enum_variant,
    ),

    //grammar.lalrpop: 503
    //See NOTE[scanner].
    chunk_literal_single: $ => choice(
      $.str_esc_char,
      $.str_literal,
      $.percent,
    ),

    //See NOTE[scanner].
    chunk_literal_multi: $ => choice(
      $.str_esc_char,
      $.mult_str_literal,
      $.percent,
      $.double_quote,
    ),

    percent: _ => "%",
    double_quote: _ => "\"",

    str_literal: _ => /[^"%\\]+/,
    mult_str_literal: _ => /[^"%]+/,
    str_esc_char: _ => /\\./,

    //grammar.lalrpop: 509
    // Different from lalrpop grammar, we parse all possible builtins, not just
    // the defined ones.
    builtin: _ => seq(
      "%",
      // We are a bit more liberal with what can go in a builtin function than
      // for identifiers, because builtins are properly delimited by `%`.
      // Upstream Nickel added `/` as a valid character already, so there's a
      // precendent for extensions (although it's not very likely), so we try to
      // be a bit future-proof. We just make sure the builtin starts with either
      // a letter or an undescore, to ensure reasonable names.
      /_*[a-zA-Z][a-zA-Z0-9./_'-]*/,
      "%",
    ),

    pattern_guard: $ => seq(
      "if",
      $.term,
    ),

    match_branch: $ => seq(
      field("pat", $.pattern),
      field("guard", optional($.pattern_guard)),
      "=>",
      field("body", $.term)
    ),

    //grammar.lalrpop: 554
    infix_b_op_2: _ => choice(
      "++",
      "@",
    ),

    //grammar.lalrpop: 559
    infix_b_op_3: _ => choice(
      "*",
      "/",
      "%",
    ),

    //grammar.lalrpop: 565
    infix_b_op_4: _ => choice(
      "+",
      "-",
    ),

    //grammar.lalrpop: 570
    infix_u_op_5: _ => choice(
      "!",
    ),

    //grammar.lalrpop: 574
    infix_b_op_6: _ => choice(
      "&",
      "|>",
    ),

    //grammar.lalrpop: 578
    infix_b_op_7: _ => choice(
      "<",
      "<=",
      ">",
      ">=",
    ),

    //grammar.lalrpop: 585
    infix_b_op_8: _ => choice(
      "==",
      "!=",
    ),

    //grammar.lalrpop: 589
    infix_lazy_b_op_9: _ => choice(
      "&&",
    ),

    //grammar.lalrpop: 593
    infix_lazy_b_op_10: _ => choice(
      "||",
    ),

    //grammar.lalrpop: 597
    infix_b_op: $ => choice(
      $.infix_b_op_2,
      $.infix_b_op_3,
      $.infix_b_op_4,
      $.infix_b_op_6,
      $.infix_b_op_7,
      $.infix_b_op_8,
    ),

    //grammar.lalrpop: 606
    infix_u_op_or_lazy_b_op: $ => choice(
      $.infix_u_op_5,
      $.infix_lazy_b_op_9,
      $.infix_lazy_b_op_10,
    ),

    //grammar.lalrpop: 606
    infix_op: $ => choice(
      $.infix_b_op,
      $.infix_u_op_or_lazy_b_op,
    ),

    //grammar.lalrpop: 617
    curried_op: $ => choice(
      $.infix_op,
      // Field access isn't a proper infix operator, it's a form with special
      // treatment (in particular because the second argument isn't necessarily
      // a string but can be a statically known identifier, which can't be
      // encoded as a generic operator application). It is thus not included in
      // `infix_op`.
      //
      // Still, Nickel allows to use it as a curried operator as in `(.) foo
      // bar`, so we add it here manually.
      ".",
      // NOTE: Removed, see NOTE[special-infix].
      //"|>",
      //"!=",
    ),

    //grammar.lalrpop: 662
    // Precedence values are taken from lalrpop grammar
    // https://github.com/tweag/nickel/blob/master/src/grammar.lalrpop
    // In lalrpop the highest precedence is 0.
    // Higher numbers imply a lower precedence. In tree-sitter however, a high
    // number implies a high precedence. To solve this issue, while keeping
    // the numbers the same, all precedence values are negated.
    //
    // Additionally, we don't actually construct an AST, so special rules (such
    // as |> and !=) are standardised.
    infix_expr: $ => choice(
      prec.left(-0, $.applicative),
      prec(-1, seq(field("op", "-"), field("t", $.infix_expr))),
      prec.left(-2, seq(field("t1", $.infix_expr), field("op", $.infix_b_op_2), field("t2", $.infix_expr))),
      prec.left(-3, seq(field("t1", $.infix_expr), field("op", $.infix_b_op_3), field("t2", $.infix_expr))),
      prec.left(-4, seq(field("t1", $.infix_expr), field("op", $.infix_b_op_4), field("t2", $.infix_expr))),
      prec.left(-5, seq(field("op", $.infix_u_op_5), field("t", $.infix_expr))),
      // NOTE: The "|>" rule is part of the infix_b_op_6 rule because we don't
      // need to treat is specially. See NOTE[special-infix].
      prec.left(-6, seq(field("t1", $.infix_expr), field("op", $.infix_b_op_6), field("t2", $.infix_expr))),
      prec.left(-7, seq(field("t1", $.infix_expr), field("op", $.infix_b_op_7), field("t2", $.infix_expr))),
      // NOTE: The "!=" rule is part of the infix_b_op_8 rule because we don't
      // need to treat is specially. See NOTE[special-infix].
      prec.left(-8, seq(field("t1", $.infix_expr), field("op", $.infix_b_op_8), field("t2", $.infix_expr))),
      prec.left(-9, seq(field("t1", $.infix_expr), field("op", $.infix_lazy_b_op_9), field("t2", $.infix_expr))),
      prec.left(-10, seq(field("t1", $.infix_expr), field("op", $.infix_lazy_b_op_10), field("t2", $.infix_expr))),
      prec.right(-11, seq(field("t1", $.infix_expr), field("op", "->"), field("t2", $.infix_expr))),
    ),

    //grammar.lalrpop: 736
    type_builtin: _ => choice(
      "Dyn",
      "Number",
      "Bool",
      "String",
    ),

    //grammar.lalrpop: 743
    type_atom: $ => choice(
      $.type_builtin,
      "_",
      seq(
        "[|",
        field("rows", commaSep($.enum)),
        field("tail", optional(seq(";", $.ident))),
        "|]",
      ),
      seq(
        "{",
        "_",
        ":",
        field("types", $.types),
        "}",
      ),
      seq(
        "{",
        "_",
        "|",
        field("types", $.types),
        "}",
      ),
    ),

  },
});

// Because tree-sitter rules can't be proper functions, we need to relocate the
// macro rule definitions here as free standing functions.
function pattern_dataF($, enum_rule, or_rule) {
  return choice(
    $.record_pattern,
    $.array_pattern,
    $.constant_pattern,
    enum_rule,
    $.ident,
    "_",
    or_rule,
  )
}

function patternF($, enum_rule, or_rule) {
  return choice(
    seq(
      optional(field("alias", seq($.ident, "@"))),
      field("pat", pattern_dataF($, enum_rule, or_rule))
     ),
  )
}

function sep(rule, separator) {
  return optional(sep1(rule, separator));
}

function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}

function commaSep(rule) {
  return sep(rule, ",");
}

function parens(rule) {
  return seq("(", rule, ")");
}

/**
 * Recognizes a comma-separated, bracketed list of elements.
 *
 * @param {function} rule - The rule to use for the elements of the list.
 * @param {string|null} field_label - The name of the field to wrap the elements in,
 *                              or `null` if no field should be used.
 */
function list(rule, field_label = null) {
  if (field_label != null) {
    return seq("[", (field(field_label, seq(commaSep(rule), optional(",")))), "]");
  }
  else {
    return seq("[", (seq(commaSep(rule), optional(","))), "]");
  }
}
