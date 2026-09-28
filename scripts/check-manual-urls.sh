#!/bin/bash

check_url() {
  local url="$1"
  if [ -z "$url" ]; then
    echo "not_checked"
    return
  fi
  
  status=$(curl -sI -w "%{http_code}" -o /dev/null "$url" 2>/dev/null)
  if [ -z "$status" ]; then
    echo "error"
  else
    echo "$status"
  fi
}

echo "model,manual_title,manual_url,http_status,date_checked,source"

# Existing found manuals
check_url "https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2000-Lift-Assembly-Exploded-Diagram.pdf"
echo "\"2010, 2015, 2020, 2025\",\"Series 2000 Lift Assembly Exploded Diagram\",\"https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2000-Lift-Assembly-Exploded-Diagram.pdf\",\"$(check_url 'https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2000-Lift-Assembly-Exploded-Diagram.pdf')\",\"2026-09-28\",\"web_search\""

echo "\"2012S\",\"Series 2000 Short Stack Lift Assembly Exploded Diagram\",\"https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2000-Short-Stack-Lift-Assembly-Exploded-Diagram.pdf\",\"$(check_url 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2000-Short-Stack-Lift-Assembly-Exploded-Diagram.pdf')\",\"2026-09-28\",\"web_search\""

echo "\"2112, 2118, 2124\",\"Series 2100 Lift Assembly Exploded Diagram\",\"https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2100-Lift-Assembly-Exploded-Diagram.pdf\",\"$(check_url 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2100-Lift-Assembly-Exploded-Diagram.pdf')\",\"2026-09-28\",\"web_search\""

echo "\"2208, 2210\",\"Series 2200 Lift Assembly Exploded Diagram\",\"https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2200-Lift-Assembly-Exploded-Diagram.pdf\",\"$(check_url 'https://sumner.com/wp-content/uploads/sites/14/2025/11/Series-2200-Lift-Assembly-Exploded-Diagram.pdf')\",\"2026-09-28\",\"web_search\""

echo "\"2412, 2416\",\"2412 Series Lift Assembly\",\"https://sumner.com/wp-content/uploads/sites/14/2025/07/2412-Series-Lift-Assembly.pdf\",\"$(check_url 'https://sumner.com/wp-content/uploads/sites/14/2025/07/2412-Series-Lift-Assembly.pdf')\",\"2026-09-28\",\"web_search\""

echo "\"2512, 2515\",\"Series 2500 Lift Assembly Exploded Diagram\",\"https://sumner.com/wp-content/uploads/sites/14/2025/07/2010_Series2500Lift_diagrams.pdf\",\"$(check_url 'https://sumner.com/wp-content/uploads/sites/14/2025/07/2010_Series2500Lift_diagrams.pdf')\",\"2026-09-28\",\"web_search_task2\""

echo "\"2615\",\"Series 2600 Lift Assembly Exploded Diagram\",\"https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2600-Lift-Assembly-Exploded-Diagram.pdf\",\"$(check_url 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Series-2600-Lift-Assembly-Exploded-Diagram.pdf')\",\"2026-09-28\",\"web_search\""

echo "\"EVENTER 16\",\"Eventer 16 Parts Manual\",\"https://sumner.com/wp-content/uploads/sites/14/2025/07/Eventer_16_Parts_Manual_10_11.pdf\",\"$(check_url 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Eventer_16_Parts_Manual_10_11.pdf')\",\"2026-09-28\",\"web_search_task2\""

echo "\"GH2T\",\"2 Ton Gantry Assembly Exploded Diagram\",\"https://sumner.com/wp-content/uploads/sites/14/2025/07/2-Ton-Gantry-Assembly-Exploded-Diagram.pdf\",\"$(check_url 'https://sumner.com/wp-content/uploads/sites/14/2025/07/2-Ton-Gantry-Assembly-Exploded-Diagram.pdf')\",\"2026-09-28\",\"web_search\""

echo "\"1908, 1910\",\"Sumner 1910 Series Lift Exploded Diagram\",\"https://sumner.com/wp-content/uploads/sites/14/2025/07/Sumner-1910-Series-Lift-Exploded-Diagram.pdf\",\"$(check_url 'https://sumner.com/wp-content/uploads/sites/14/2025/07/Sumner-1910-Series-Lift-Exploded-Diagram.pdf')\",\"2026-09-28\",\"web_search_task2\""

# Not found
echo "\"R-100, R-150, R-180, R-250\",\"R-Series Parts Manual\",\"\",\"not_found\",\"2026-09-28\",\"web_search_task2_not_found\""
echo "\"Roust-A-Bout\",\"Roust-A-Bout Exploded Diagram\",\"\",\"not_found\",\"2026-09-28\",\"web_search_task2_not_found\""
echo "\"SLC-18, SLC-24\",\"SLC Series Parts Manual\",\"\",\"not_found\",\"2026-09-28\",\"web_search_task2_not_found\""
