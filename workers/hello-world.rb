#!/usr/bin/ruby

$i = 1

while true do
  puts "#$i Hello, Ruby"
  $stdout.flush
  sleep(5)
  $i += 1
end
