{
  x = let a = 1 in a,
  #     ^ keyword
  #               ^ keyword

  f = fun a => a,
  #     ^ keyword.function
  #         ^ parameter

  cond = if true then 1 else 2,
  #        ^ keyword.conditional
  #                ^ keyword.conditional
  #                       ^ keyword.conditional

  matcher = match { 'foo => 1 },
  #           ^ keyword.conditional

  imported = import "foo.ncl",
  #            ^ include

  foo | default = 1,
  #       ^ keyword
  bar | doc "hello",
  #       ^ keyword
  baz | optional,
  #       ^ keyword
  qux | priority 1,
  #       ^ keyword
  quux | force = 1,
  #        ^ keyword
  corge | rec default = {},
  #         ^ keyword
  grault | not_exported,
  #          ^ keyword
}
