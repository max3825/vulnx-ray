
$content = Get-Content 'C:\Users\pelissim\Documents\vulnx-ray\frontend\src\app\cve-search\page.tsx'
$lines = $content[253..609]
$stack = @()

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $chars = $line.ToCharArray()
    foreach ($char in $chars) {
        if ($char -eq '{' -or $char -eq '(') {
            $stack += $char
        }
        elseif ($char -eq '}' -or $char -eq ')') {
            if ($stack.Count -eq 0) {
                Write-Output "Line $($i + 254): Unmatched $char"
                exit
            }
            $last = $stack[-1]
            $stack = $stack[0..($stack.Count - 2)]
            
            if (($last -eq '{' -and $char -ne '}') -or ($last -eq '(' -and $char -ne ')')) {
                Write-Output "Line $($i + 254): Expected matching closure for $last, got $char"
                exit
            }
        }
    }
}
Write-Output "Analysis Complete. Remaining stack: $($stack.Count)"
