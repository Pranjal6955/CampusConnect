#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const reanimatedBasePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-reanimated',
  'Common',
  'cpp',
  'reanimated'
);

// Files to fix with specific paths
const filesToFix = [
  {
    file: 'Fabric/PropsRegistry.h',
    fixes: [
      {
        pattern: /ShadowNode::Shared/g,
        replacement: 'std::shared_ptr<const ShadowNode>'
      }
    ]
  },
  {
    file: 'Fabric/ReanimatedMountHook.h',
    fixes: [
      {
        // Match the function signature with double mountTime parameter
        pattern: /(\s+void\s+shadowTreeDidMount\s*\([^,)]+,\s*)double\s+mountTime(\s*\)\s+noexcept\s+override;)/g,
        replacement: '$1HighResTimeStamp mountTime$2'
      },
      {
        // Fallback: just replace double mountTime with HighResTimeStamp mountTime
        pattern: /double\s+mountTime/g,
        replacement: 'HighResTimeStamp mountTime'
      }
    ],
    // Check if we need to add includes
    checkIncludes: true
  },
  {
    file: 'Fabric/ShadowTreeCloner.cpp',
    fixes: [
      {
        pattern: /ShadowNode::Unshared/g,
        replacement: 'std::shared_ptr<ShadowNode>'
      },
      {
        pattern: /ShadowNode::ListOfShared/g,
        replacement: 'std::vector<std::shared_ptr<const ShadowNode>>'
      }
    ]
  },
  {
    file: 'Fabric/ReanimatedCommitHook.cpp',
    fixes: [
      {
        pattern: /ShadowNode::Shared/g,
        replacement: 'std::shared_ptr<const ShadowNode>'
      }
    ]
  },
  {
    file: 'Fabric/ReanimatedCommitHook.h',
    fixes: [
      {
        pattern: /ShadowNode::Shared/g,
        replacement: 'std::shared_ptr<const ShadowNode>'
      }
    ]
  }
];

// Also search for any other files that might have deprecated types
function findAndFixAllFiles(basePath) {
  const results = [];
  
  function walkDir(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath, fileList);
      } else if (file.endsWith('.cpp') || file.endsWith('.h') || file.endsWith('.hpp')) {
        fileList.push(filePath);
      }
    });
    
    return fileList;
  }
  
  try {
    const fabricPath = path.join(basePath, 'Fabric');
    if (fs.existsSync(fabricPath)) {
      const allFiles = walkDir(fabricPath);
      
      allFiles.forEach(filePath => {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          let modified = false;
          let newContent = content;
          
          // Apply all common fixes
          if (content.includes('ShadowNode::Shared')) {
            newContent = newContent.replace(/ShadowNode::Shared/g, 'std::shared_ptr<const ShadowNode>');
            modified = true;
          }
          
          if (content.includes('ShadowNode::Unshared')) {
            newContent = newContent.replace(/ShadowNode::Unshared/g, 'std::shared_ptr<ShadowNode>');
            modified = true;
          }
          
          if (content.includes('ShadowNode::ListOfShared')) {
            newContent = newContent.replace(/ShadowNode::ListOfShared/g, 'std::vector<std::shared_ptr<const ShadowNode>>');
            modified = true;
          }
          
          if (content.includes('double mountTime') && !content.includes('HighResTimeStamp mountTime')) {
            newContent = newContent.replace(/double\s+mountTime/g, 'HighResTimeStamp mountTime');
            modified = true;
            
            // Add include if needed
            if (!newContent.includes('HighResTimeStamp.h') && !newContent.includes('UIManagerMountHook.h')) {
              const reactIncludePattern = /(#include\s+<react\/renderer\/[^>]+>)/g;
              const matches = [...newContent.matchAll(reactIncludePattern)];
              if (matches.length > 0) {
                const lastMatch = matches[matches.length - 1];
                const insertPos = lastMatch.index + lastMatch[0].length;
                newContent = newContent.slice(0, insertPos) + 
                           '\n#include <react/renderer/core/HighResTimeStamp.h>' + 
                           newContent.slice(insertPos);
              }
            }
          }
          
          if (modified) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            const relativePath = path.relative(basePath, filePath);
            results.push(relativePath);
          }
        } catch (error) {
          // Skip files that can't be read/written
        }
      });
    }
  } catch (error) {
    // Ignore errors in directory walking
  }
  
  return results;
}

function fixFile(filePath, fixes, fileName, checkIncludes = false) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const fix of fixes) {
      if (fix.pattern.test(content)) {
        content = content.replace(fix.pattern, fix.replacement);
        modified = true;
      }
    }

    // Check if we need to add HighResTimeStamp include
    // HighResTimeStamp is typically defined in react/renderer/core/HighResTimeStamp.h
    // but it might also be available through other React Native headers
    if (checkIncludes && content.includes('HighResTimeStamp')) {
      // Check if HighResTimeStamp is already included or available through other headers
      const hasHighResTimeStampInclude = content.includes('HighResTimeStamp.h') || 
                                         content.includes('UIManagerMountHook.h') ||
                                         content.includes('react/renderer/uimanager');
      
      if (!hasHighResTimeStampInclude) {
        // Try to add the include after other React includes
        const reactIncludePattern = /(#include\s+<react\/renderer\/[^>]+>)/;
        const matches = content.match(reactIncludePattern);
        if (matches) {
          // Add after the last React include
          const lastMatch = matches[matches.length - 1];
          const lastIndex = content.lastIndexOf(lastMatch);
          if (lastIndex !== -1) {
            const insertPos = lastIndex + lastMatch.length;
            content = content.slice(0, insertPos) + 
                     '\n#include <react/renderer/core/HighResTimeStamp.h>' + 
                     content.slice(insertPos);
            modified = true;
          }
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed ${fileName}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`⚠ Error fixing ${fileName}:`, error.message);
    return false;
  }
}

// Main execution
if (fs.existsSync(reanimatedBasePath)) {
  console.log('Fixing react-native-reanimated deprecation warnings...');
  
  let fixedCount = 0;
  
  // Fix specific files
  for (const fileConfig of filesToFix) {
    const filePath = path.join(reanimatedBasePath, fileConfig.file);
    if (fixFile(filePath, fileConfig.fixes, fileConfig.file, fileConfig.checkIncludes)) {
      fixedCount++;
    }
  }
  
  // Also search for any other files that might have deprecated types
  console.log('Scanning for additional files with deprecated types...');
  const additionalFiles = findAndFixAllFiles(reanimatedBasePath);
  if (additionalFiles.length > 0) {
    console.log(`✓ Fixed ${additionalFiles.length} additional file(s):`);
    additionalFiles.forEach(file => console.log(`  - ${file}`));
    fixedCount += additionalFiles.length;
  }
  
  if (fixedCount > 0) {
    console.log(`\n✓ Total: Fixed ${fixedCount} file(s)`);
  } else {
    console.log('✓ All files already fixed or up-to-date');
  }
} else {
  console.log('⚠ react-native-reanimated not found, skipping fix (this is normal if the package is not installed yet)');
}

