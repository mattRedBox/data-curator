Feature: Report Issues
  As a User  
  I want to report issues I find in the application  
  So that I can help improve the application  

  RULES
  =====

  - "Report Issues" can be invoked from a menu item
  - Support will be launched in a separate browser window that will require access to the internet
  - The Report Issues URL will be hosted on https://github.com/qcif/data-curator/blob/master/.github/CONTRIBUTING.md

  Scenario: Use the menu to open the report issues page
    Given Data Curator is open
    When "Report Issues" is invoked
    Then the Report Issues URL should be opened in a separate browser window
