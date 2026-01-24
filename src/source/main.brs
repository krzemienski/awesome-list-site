sub main(params)

  screen = createObject("roSGscreen")
  port = createObject("roMessagePort")
  screen.setMessagePort(port)

  scene = screen.createScene("Main")
  screen.show() ' vscode_rale_tracker_entry

  while true
      msg = wait(0,port)
      msgType = type(msg)
      if "roSGScreenEvent" = msgType
          if msgType.isScreenClose() then return
      end if
  end while
end sub