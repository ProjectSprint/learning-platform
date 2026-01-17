Feature: Networking question - connect two computers
  The player connects two PCs to a router, enables DHCP, and verifies connectivity with ping.

  Background:
    Given the question "Connect Two Computers" is loaded
    And the phase is "setup"
    And the canvas is empty
    And the inventory contains PC-1, PC-2, a router, and cables

  Scenario: Happy path from setup to completion
    When the player places PC-1 on the canvas
    And the player places the router on the canvas
    And the player connects PC-1 to the router
    Then the router is present and unconfigured
    And PC-1 has no IP address
    When the player opens the router configuration
    And the player enables DHCP with IP range "192.168.1.0/24"
    And the player saves the router configuration
    Then the router is configured
    And PC-1 receives IP "192.168.1.2"
    When the player places PC-2 on the canvas
    And the player connects PC-2 to the router
    Then PC-2 receives IP "192.168.1.3"
    And the terminal prompt is shown
    When the player submits "ping PC-2"
    Then the question is completed

  Scenario: Router configuration is blocked until the router is placed
    When the player attempts to open the router configuration
    Then no configuration modal is shown
    And the router remains unconfigured

  Scenario: Router configuration is allowed as soon as the router is placed
    When the player places the router on the canvas
    And the player opens the router configuration
    Then the configuration modal is shown

  Scenario: A PC cannot be connected to a router that is not on the canvas
    When the player places PC-1 on the canvas
    And the player attempts to connect PC-1 to the router
    Then no connection is created
    And PC-1 has no IP address

  Scenario: Gate A requires a router and at least one connected PC
    When the player places the router on the canvas
    Then the phase remains "setup"
    When the player places PC-1 on the canvas
    And the player connects PC-1 to the router
    Then the phase changes to "playing"

  Scenario: DHCP must be enabled for any PC to receive an IP
    When the player places PC-1 on the canvas
    And the player places the router on the canvas
    And the player connects PC-1 to the router
    And the player opens the router configuration
    And the player saves the router configuration with DHCP disabled
    Then the router is unconfigured
    And PC-1 has no IP address

  Scenario: Connected PCs receive IPs when DHCP is enabled
    When the player places PC-1 on the canvas
    And the player places the router on the canvas
    And the player connects PC-1 to the router
    And the player opens the router configuration
    And the player enables DHCP with IP range "192.168.1.0/24"
    And the player saves the router configuration
    Then PC-1 receives IP "192.168.1.2"

  Scenario: PCs connected before DHCP is enabled receive IPs after configuration
    When the player places PC-1 on the canvas
    And the player places PC-2 on the canvas
    And the player places the router on the canvas
    And the player connects PC-1 to the router
    And the player connects PC-2 to the router
    Then PC-1 has no IP address
    And PC-2 has no IP address
    When the player opens the router configuration
    And the player enables DHCP with IP range "192.168.1.0/24"
    And the player saves the router configuration
    Then PC-1 receives IP "192.168.1.2"
    And PC-2 receives IP "192.168.1.3"

  Scenario: Gate B requires both PCs to have IPs before terminal phase
    When the player places PC-1 on the canvas
    And the player places PC-2 on the canvas
    And the player places the router on the canvas
    And the player connects PC-1 to the router
    And the player connects PC-2 to the router
    Then the terminal prompt is not shown
    When the player opens the router configuration
    And the player enables DHCP with IP range "192.168.1.0/24"
    And the player saves the router configuration
    Then the terminal prompt is shown

  Scenario Outline: Valid ping commands complete the question
    Given the network is fully configured with PC-1 at "192.168.1.2" and PC-2 at "192.168.1.3"
    And the terminal prompt is shown
    When the player submits "<command>"
    Then the question is completed

    Examples:
      | command           |
      | ping PC-2         |
      | ping 192.168.1.3  |

  Scenario Outline: Invalid terminal commands do not complete the question
    Given the network is fully configured with PC-1 at "192.168.1.2" and PC-2 at "192.168.1.3"
    And the terminal prompt is shown
    When the player submits "<command>"
    Then the command is rejected
    And the question remains in the "terminal" phase

    Examples:
      | command                 |
      | connect PC-1 PC-2       |
      | check network           |
      | ping                    |
      | ping PC-1               |
      | ping 192.168.1.2        |
      | ping 10.0.0.1           |

  Rule: Hint triggers and content

  Scenario: Placement hint appears after 30 seconds of inactivity
    Given the router is not placed
    When the player is idle for 30 seconds
    Then a hint toast is shown with text "Drag the router from inventory to the canvas."
    And the hint toast links to "https://www.google.com/search?q=what+is+a+router"

  Scenario: Connection hint appears after 30 seconds with router placed but no connection
    Given the router is placed
    And PC-1 is placed
    And PC-1 is not connected to the router
    When the player is idle for 30 seconds
    Then a hint toast is shown with text "Connect PC-1 to the router using a cable."
    And the hint toast links to "https://www.google.com/search?q=ethernet+cable"

  Scenario: Router configuration hint appears after 60 seconds of inactivity
    Given the router is placed
    And PC-1 is connected to the router
    And the router is unconfigured
    When the player is idle for 60 seconds
    Then a hint toast is shown with text "Open the router settings and enable DHCP."
    And the hint toast links to "https://www.google.com/search?q=dhcp+router+configuration"

  Scenario: DHCP concept hint appears after 90 seconds when PCs lack IPs
    Given the router is placed
    And PC-1 is connected to the router
    And PC-2 is connected to the router
    And the router is unconfigured
    And PC-1 has no IP address
    And PC-2 has no IP address
    When the player is idle for 90 seconds
    Then a hint toast is shown with text "Choose a private IP range so the router can assign IPs."
    And the hint toast links to "https://www.google.com/search?q=private+ip+range"

  Scenario: Cable hint appears after two invalid cable drops
    When the player makes 2 invalid cable drops
    Then a hint toast is shown with text "A cable must connect two placed devices."
    And the hint toast links to "https://www.google.com/search?q=ethernet+cable+connection"

  Scenario: CIDR hint appears after two invalid router configuration saves
    Given the router is placed
    When the player saves the router configuration with an invalid CIDR 2 times
    Then a hint toast is shown with text "Use a private CIDR range like 192.168.1.0/24."
    And the hint toast links to "https://www.google.com/search?q=cidr+notation+private+ip+range"

  Scenario: Terminal idle hint appears after 30 seconds
    Given the network is fully configured with PC-1 at "192.168.1.2" and PC-2 at "192.168.1.3"
    And the terminal prompt is shown
    When the player is idle for 30 seconds
    Then a hint toast is shown with text "Use a command that tests reachability between two computers."
    And the hint toast links to "https://www.google.com/search?q=ping+command"
    And the hint text does not include "ping PC-2" or "ping 192.168.1.3"

  Scenario: Terminal hint appears after two invalid commands
    Given the network is fully configured with PC-1 at "192.168.1.2" and PC-2 at "192.168.1.3"
    And the terminal prompt is shown
    When the player submits 2 invalid commands
    Then a hint toast is shown with text "That reachability test is commonly called ping."
    And the hint toast links to "https://www.google.com/search?q=ping+command"
    And the hint text does not include "ping PC-2" or "ping 192.168.1.3"

  Scenario: Terminal hint appears after three invalid commands
    Given the network is fully configured with PC-1 at "192.168.1.2" and PC-2 at "192.168.1.3"
    And the terminal prompt is shown
    When the player submits 3 invalid commands
    Then a hint toast is shown with text "Target the other PC or its IP address."
    And the hint toast links to "https://www.google.com/search?q=ping+ip+address"
    And the hint text does not include "ping PC-2" or "ping 192.168.1.3"

  Rule: Hint rules and accessibility

  Scenario: Only one hint is visible at a time
    Given the router is not placed
    When the player is idle for 30 seconds
    Then a hint toast is shown
    And only 1 hint toast is visible
    When the player remains idle for another 60 seconds
    Then only 1 hint toast is visible

  Scenario: Meaningful actions reset the idle timer
    Given the router is placed
    And PC-1 is placed
    And PC-1 is not connected to the router
    When the player is idle for 20 seconds
    And the player places PC-2 on the canvas
    And the player is idle for 20 seconds
    Then no hint toast is shown
    When the player is idle for 30 seconds
    Then a hint toast is shown with text "Connect PC-1 to the router using a cable."

  Scenario: Hints are suppressed while a modal is open
    Given the router is placed
    And the router is unconfigured
    And the router configuration modal is open
    When the player is idle for 60 seconds
    Then no hint toast is shown
    When the player closes the router configuration modal
    And the player is idle for 60 seconds
    Then a hint toast is shown with text "Open the router settings and enable DHCP."

  Scenario: Hint text is not repeated within a session
    Given the router is not placed
    When the player is idle for 30 seconds
    Then a hint toast is shown with text "Drag the router from inventory to the canvas."
    When the player dismisses the hint toast
    And the player is idle for 30 seconds
    Then no hint toast is shown with text "Drag the router from inventory to the canvas."

  Scenario: Router configuration hints take priority over connection hints
    Given the router is placed
    And PC-1 is placed
    And PC-1 is not connected to the router
    And the router is unconfigured
    And no hints have been shown in this session
    When the player is idle for 60 seconds
    Then a hint toast is shown with text "Open the router settings and enable DHCP."
    And no hint toast is shown with text "Connect PC-1 to the router using a cable."

  Scenario: Hint toasts expose accessible UI affordances
    Given the router is not placed
    When the player is idle for 30 seconds
    Then the hint toast has aria-live "polite"
    And the hint toast has a dismiss button
    And the dismiss button is keyboard focusable

  Scenario: Hints auto-dismiss after 10 seconds when not focused
    Given the router is not placed
    When the player is idle for 30 seconds
    And the player does not focus the hint toast for 10 seconds
    Then the hint toast is dismissed

  Scenario: Focused hints remain until focus is removed
    Given the router is placed
    And PC-1 is placed
    And PC-1 is not connected to the router
    When the player is idle for 30 seconds
    And the player focuses the hint toast
    And 10 seconds pass
    Then the hint toast is still visible
    When the player moves focus away from the hint toast
    Then the hint toast is dismissed after 10 seconds

  Scenario: Visible hints are capped at three
    Given three hint toasts are visible
    When a fourth hint toast is triggered
    Then only 3 hint toasts are visible
    And the oldest hint toast is dismissed
