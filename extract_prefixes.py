import pandas as pd
import os

def extract_prefixes():
    """
    Extract unique prefixes from Slack channel names in Channels.xlsx
    Prefixes are defined as the part before the first '-' character
    """
    excel_file = 'Channels.xlsx'
    
    if not os.path.exists(excel_file):
        print(f"Error: {excel_file} not found!")
        return
    
    # Read the Excel file
    try:
        # Read all sheets
        excel_data = pd.read_excel(excel_file, sheet_name=None)
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return
    
    # Get the main Channels sheet (first sheet or sheet named 'Channels')
    if 'Channels' in excel_data:
        channels_df = excel_data['Channels'].copy()
        main_sheet_name = 'Channels'
    else:
        # Use first sheet
        main_sheet_name = list(excel_data.keys())[0]
        channels_df = excel_data[main_sheet_name].copy()
    
    print(f"✓ Successfully loaded Excel file")
    print(f"  Main sheet: '{main_sheet_name}' with {len(channels_df)} rows")
    print(f"  Columns found: {list(channels_df.columns)}")
    
    # Check for Name column
    if 'Name' not in channels_df.columns:
        print("Error: 'Name' column not found!")
        return
    
    # Check if Tags column exists, if not create it
    if 'Tags' not in channels_df.columns:
        channels_df['Tags'] = ''
        print("  Created 'Tags' column")
    
    # Extract prefixes for each channel
    all_prefixes = set()
    tags_list = []
    
    print("\n  Processing channel names...")
    for name in channels_df['Name']:
        if pd.notna(name):
            name_str = str(name).strip()
            
            # Extract prefix (text before first '-')
            if '-' in name_str:
                prefix = name_str.split('-')[0].strip()
                if prefix:
                    all_prefixes.add(prefix.lower())
                    tags_list.append(prefix)
                else:
                    tags_list.append('')
            else:
                tags_list.append('')
        else:
            tags_list.append('')
    
    # Update Tags column with prefixes
    channels_df['Tags'] = tags_list
    
    # Sort prefixes for reference sheet
    sorted_prefixes = sorted(all_prefixes)
    
    # Create/update Tags reference sheet with only Prefix column
    tags_df = pd.DataFrame({
        'Prefix': sorted_prefixes
    })
    
    # Update excel_data
    excel_data[main_sheet_name] = channels_df
    excel_data['Tags'] = tags_df
    
    # Write to markdown file for reference
    output_file = 'unique_prefixes.md'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# Unique Channel Name Prefixes\n\n")
        f.write(f"Total unique prefixes found: {len(sorted_prefixes)}\n\n")
        f.write("## Prefixes List\n\n")
        for prefix in sorted_prefixes:
            f.write(f"- {prefix}\n")
    
    # Save to Excel
    try:
        with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
            for sheet_name, df in excel_data.items():
                df.to_excel(writer, sheet_name=sheet_name, index=False)
        
        print(f"\n✓ Found {len(sorted_prefixes)} unique prefixes")
        print(f"✓ Populated Tags column in '{main_sheet_name}' sheet with prefixes")
        print(f"✓ Updated 'Tags' reference sheet with {len(tags_df)} prefixes (Prefix column only)")
        print(f"✓ Results saved to {output_file}")
        
        # Show statistics
        tagged_count = sum(1 for tag in tags_list if tag)
        print(f"\n📊 Statistics:")
        print(f"  - Channels with tags: {tagged_count}/{len(channels_df)}")
        print(f"  - Unique prefixes: {len(sorted_prefixes)}")
        
    except PermissionError:
        print("\n⚠ Error: Please close Channels.xlsx and try again!")
    except Exception as e:
        print(f"Error saving Excel file: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    extract_prefixes()
