; NOTE: Nickel has no block comments
(comment) @comment.line

[
  "."
] @punctuation.delimiter
[
  "{" "}"
  "(" ")"
  "[|" "|]"
  "[" "]"
] @punctuation.bracket
(multstr_start) @punctuation.bracket
(multstr_end) @punctuation.bracket
(interpolation_start) @punctuation.bracket
(interpolation_end) @punctuation.bracket

"null" @constant.builtin
(bool) @boolean
(str_esc_char) @string.escape
(num_literal) @number

(fun_expr
  "fun" @keyword.function
  "rec"? @keyword
  pats:
    (pattern
      id: (ident) @parameter
    )+
  "=>" @operator
)

(types) @type
(type_builtin) @type.builtin
"Array" @type.builtin

(enum_tag) @definition.enum

(str_chunks) @string

; Nickel doesn't use comments for documentation, ideally this would be
; `@documentation` or something similar
(annot_atom
  doc: (static_string) @definition.doc
)

(record_operand (atom (ident) @variable))
(let_expr
  "let" @keyword
  "rec"? @keyword
  pat: (pattern
    (ident) @variable
  )
  "in" @keyword
)
(record_field) @variable.other.member

"import" @keyword.control.import
(applicative
  "import"
  s: (static_string) @definition.import
)

(applicative
  t1: (applicative
    (record_operand) @function
  )
)

["forall" "default" "doc"] @keyword
["if" "then" "else" "switch"] @conditional

(infix_expr
  op: (_) @operator
)

(builtin) @function.builtin
