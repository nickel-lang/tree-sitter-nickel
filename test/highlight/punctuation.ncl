{ a = 1 }
# <- punctuation.bracket
#     ^ punctuation.bracket
{
  b = (1 + 2),
  #     ^ punctuation.bracket
  #           ^ punctuation.bracket

  c = [1, 2, 3],
  #     ^ punctuation.bracket
  #             ^ punctuation.bracket

  d = [| 'foo, 'bar |],
  #     ^^ punctuation.bracket
  #                    ^^ punctuation.bracket

  g : Number = 1,
  #   ^ punctuation.delimiter

  h = [1, 2, 3],
  #       ^ punctuation.delimiter
  #          ^ punctuation.delimiter
}
