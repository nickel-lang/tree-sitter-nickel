{
  a = 1 + 2,
  #       ^ punctuation.delimiter

  b = 1 - 2,
  #       ^ punctuation.delimiter

  c = 1 * 2,
  #       ^ punctuation.delimiter

  d = 1 / 2,
  #       ^ operator

  e = 1 == 2,
  #       ^^ operator

  m = 1 |> (fun x => x),
  #       ^^ operator

  n = { x = 1 } & { y = 2 },
  #               ^ operator

  o = let x = 1 in x,
  #           ^ operator
}
