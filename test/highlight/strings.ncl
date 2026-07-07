"hello world"
# <- string
#           ^ string

m%"multi
#  ^ string
line string"%

"escape \n here"
#       ^^ string.escape

"interpolation %{x} here"
#              ^^ punctuation.special
#                ^ string.special
#                 ^ punctuation.special
