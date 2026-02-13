let WorkspacePackage | doc "a cargo crate manifest where version and edition point to a workspace manifest" =
# <- keyword
#                      ^ keyword
#                          ^ spell
  std.contract.from_validator (fun package =>
  #                            ^ keyword.function
  #                                ^ parameter
    if package.version == { workspace = true } then
    # <- keyword.conditional
    #                  ^^ operator
    #                     ^ punctuation.bracket
    #                                 ^ operator
    #                                          ^ keyword.conditional
      'Ok
      # <- constant
    else
    # <- keyword.conditional
      'Error {
      # <- constant
        message = "%{package.name} is invalid",
        # <- property
        #       ^ operator
        #          ^^ punctuation.special
        #            ^ string.special
        #                        ^ punctuation.special
        notes = ["version must be { workspace = true }"],
        # <- property
        #     ^ operator
        #       ^ punctuation.bracket
        #        ^ string
      }
  )
in
# <- keyword
{
  package | WorkspacePackage,
  # <- property
  #       ^ punctuation.delimiter
  ..
}
