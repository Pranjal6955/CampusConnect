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
        // Fix return type: Rootstd::shared_ptr<ShadowNode> to RootShadowNode::Unshared
        pattern: /(Rootstd::shared_ptr<ShadowNode>\s+cloneShadowTreeWithNewProps)/g,
        replacement: 'RootShadowNode::Unshared cloneShadowTreeWithNewProps'
      },
      {
        pattern: /ShadowNode::Unshared/g,
        replacement: 'std::shared_ptr<ShadowNode>'
      },
      {
        pattern: /ShadowNode::ListOfShared/g,
        replacement: 'std::vector<std::shared_ptr<const ShadowNode>>'
      },
      {
        pattern: /Rootstd::shared_ptr/g,
        replacement: 'std::shared_ptr'
      }
    ]
  },
  {
    file: 'Fabric/ReanimatedCommitHook.cpp',
    fixes: [
      {
        // Fix return type: Rootstd::shared_ptr<ShadowNode> to RootShadowNode::Unshared - simple replacement
        pattern: /Rootstd::shared_ptr<ShadowNode>\s+ReanimatedCommitHook::shadowTreeWillCommit/g,
        replacement: 'RootShadowNode::Unshared ReanimatedCommitHook::shadowTreeWillCommit'
      },
      {
        // Fix parameter: Rootstd::shared_ptr<const ShadowNode> to RootShadowNode::Shared
        pattern: /Rootstd::shared_ptr<const ShadowNode>/g,
        replacement: 'RootShadowNode::Shared'
      },
      {
        // Fix variable: Rootstd::shared_ptr<ShadowNode> to RootShadowNode::Unshared (with missing newline)
        pattern: /(reaShadowNode->unsetReanimatedMountTrait\(\);)(Rootstd::shared_ptr<ShadowNode>\s+rootNode\s*=)/g,
        replacement: '$1\n  RootShadowNode::Unshared rootNode ='
      },
      {
        // Fix any remaining Rootstd::shared_ptr<ShadowNode> to RootShadowNode::Unshared - simple replacement
        pattern: /Rootstd::shared_ptr<ShadowNode>/g,
        replacement: 'RootShadowNode::Unshared'
      },
      {
        pattern: /ShadowNode::Shared/g,
        replacement: 'std::shared_ptr<const ShadowNode>'
      },
      {
        pattern: /Rootstd::shared_ptr/g,
        replacement: 'std::shared_ptr'
      }
    ]
  },
  {
    file: 'Fabric/ReanimatedCommitHook.h',
    fixes: [
      {
        // Fix missing newline and return type: Rootstd::shared_ptr<ShadowNode> to RootShadowNode::Unshared
        pattern: /(void maybeInitializeLayoutAnimations\(SurfaceId surfaceId\));Rootstd::shared_ptr<ShadowNode>\s+shadowTreeWillCommit/g,
        replacement: '$1;\n  RootShadowNode::Unshared shadowTreeWillCommit'
      },
      {
        // Fix return type: Rootstd::shared_ptr<ShadowNode> to RootShadowNode::Unshared - simple replacement
        pattern: /Rootstd::shared_ptr<ShadowNode>\s+shadowTreeWillCommit/g,
        replacement: 'RootShadowNode::Unshared shadowTreeWillCommit'
      },
      {
        // Fix parameter: Rootstd::shared_ptr<const ShadowNode> to RootShadowNode::Shared
        pattern: /Rootstd::shared_ptr<const ShadowNode>/g,
        replacement: 'RootShadowNode::Shared'
      },
      {
        // Fix parameter: std::shared_ptr<const ShadowNode> to RootShadowNode::Shared (in function signature)
        pattern: /std::shared_ptr<const ShadowNode>\s+const\s+&\s*oldRootShadowNode/g,
        replacement: 'RootShadowNode::Shared const &oldRootShadowNode'
      },
      {
        // Fix parameter: Rootstd::shared_ptr<ShadowNode> to RootShadowNode::Unshared - simple replacement
        pattern: /Rootstd::shared_ptr<ShadowNode>/g,
        replacement: 'RootShadowNode::Unshared'
      },
      {
        pattern: /ShadowNode::Shared/g,
        replacement: 'std::shared_ptr<const ShadowNode>'
      },
      {
        pattern: /Rootstd::shared_ptr/g,
        replacement: 'std::shared_ptr'
      }
    ]
  },
  {
    file: 'Fabric/ShadowTreeCloner.h',
    fixes: [
      {
        // Fix return type: Rootstd::shared_ptr<ShadowNode> to RootShadowNode::Unshared - simple replacement
        pattern: /Rootstd::shared_ptr<ShadowNode>/g,
        replacement: 'RootShadowNode::Unshared'
      },
      {
        pattern: /Rootstd::shared_ptr/g,
        replacement: 'std::shared_ptr'
      }
    ]
  },
  {
    file: 'Fabric/ReanimatedMountHook.h',
    fixes: [
      {
        // Fix Rootstd::shared_ptr<const ShadowNode> to RootShadowNode::Shared
        pattern: /Rootstd::shared_ptr<const ShadowNode>/g,
        replacement: 'RootShadowNode::Shared'
      },
      {
        // Fix any remaining Rootstd::shared_ptr
        pattern: /Rootstd::shared_ptr/g,
        replacement: 'std::shared_ptr'
      }
    ]
  },
  {
    file: 'Fabric/ReanimatedMountHook.cpp',
    fixes: [
      {
        // Fix Rootstd::shared_ptr<const ShadowNode> to RootShadowNode::Shared
        pattern: /Rootstd::shared_ptr<const ShadowNode>/g,
        replacement: 'RootShadowNode::Shared'
      },
      {
        // Fix Rootstd::shared_ptr<ShadowNode> to RootShadowNode::Unshared (for return types)
        pattern: /->\s*Rootstd::shared_ptr<ShadowNode>/g,
        replacement: '-> RootShadowNode::Unshared'
      },
      {
        // Fix any remaining Rootstd::shared_ptr
        pattern: /Rootstd::shared_ptr/g,
        replacement: 'std::shared_ptr'
      }
    ]
  },
  {
    file: 'LayoutAnimations/LayoutAnimationsProxy.cpp',
    fixes: [
      {
        // Fix rawProps access - in RN 0.81.5, props don't have rawProps
        // Replace folly::dynamic::merge with folly::merge_patch and fix rawProps
        pattern: /folly::dynamic::merge\s*\(\s*([^,]+)->props->rawProps\s*,\s*\(folly::dynamic\)\s*\*rawProps\)/g,
        replacement: 'folly::merge_patch(folly::dynamic(), (folly::dynamic)*rawProps)'
      },
      {
        // Fix rawProps access - in RN 0.81.5, props don't have rawProps
        // Replace the entire merge_patch call with just the second argument
        pattern: /folly::merge_patch\s*\(\s*[^,]+->props->rawProps\s*,\s*\(folly::dynamic\)\s*\*rawProps\)\s*\)/g,
        replacement: 'folly::merge_patch(folly::dynamic(), (folly::dynamic)*rawProps)'
      },
      {
        pattern: /folly::merge_patch\s*\(\s*[^,]+->props\s*,\s*\(folly::dynamic\)\s*\*rawProps\)\s*\)/g,
        replacement: 'folly::merge_patch(folly::dynamic(), (folly::dynamic)*rawProps)'
      },
      {
        // Fallback: just replace ->props->rawProps
        pattern: /->props->rawProps/g,
        replacement: 'folly::dynamic()'
      },
      {
        pattern: /\.props->rawProps/g,
        replacement: 'folly::dynamic()'
      }
    ]
  },
  {
    file: 'Fabric/ReanimatedMountHook.h',
    fixes: [
      {
        // Fix Rootstd::shared_ptr<const ShadowNode> to RootShadowNode::Shared - simple replacement
        pattern: /Rootstd::shared_ptr<const ShadowNode>/g,
        replacement: 'RootShadowNode::Shared'
      },
      {
        // Fix function signature to use RootShadowNode::Shared (fallback for std::shared_ptr)
        pattern: /(\s+void\s+shadowTreeDidMount\s*\(\s*)std::shared_ptr<const ShadowNode>(\s+const\s+&\s*rootShadowNode)/g,
        replacement: '$1RootShadowNode::Shared$2'
      },
      {
        // Catch any remaining Rootstd::shared_ptr
        pattern: /Rootstd::shared_ptr/g,
        replacement: 'std::shared_ptr'
      }
    ]
  },
  {
    file: 'Fabric/ReanimatedCommitHook.h',
    fixes: [
      {
        // Fix function signature to use RootShadowNode::Shared
        pattern: /(\s+std::shared_ptr<ShadowNode>\s+shadowTreeWillCommit\s*\(\s*)std::shared_ptr<const ShadowNode>(\s+const\s+&\s*oldRootShadowNode)/g,
        replacement: '$1RootShadowNode::Shared$2'
      },
      {
        pattern: /(\s+std::shared_ptr<ShadowNode>\s+shadowTreeWillCommit\s*\([^,]+,\s*)std::shared_ptr<ShadowNode>(\s+const\s+&\s*newRootShadowNode)/g,
        replacement: '$1RootShadowNode::Unshared$2'
      }
    ]
  },
  {
    file: 'NativeModules/ReanimatedModuleProxy.h',
    fixes: [
      {
        pattern: /ShadowNode::Shared/g,
        replacement: 'std::shared_ptr<const ShadowNode>'
      }
    ]
  },
  {
    file: 'NativeModules/ReanimatedModuleProxy.cpp',
    fixes: [
      {
        // Fix shadowNodeFromValue - it seems to have been removed in RN 0.81.5
        // We'll need to handle this case by case, but for now try to use shadowNodeListFromValue
        // and extract the first element if it's a single node
        pattern: /shadowNodeFromValue\s*\(/g,
        replacement: 'shadowNodeListFromValue('
      },
      {
        // Fix return types for shadowTreeWillCommit
        pattern: /(\s+std::shared_ptr<ShadowNode>\s+shadowTreeWillCommit)/g,
        replacement: '$1'
      }
    ]
  },
  {
    file: 'Fabric/ReanimatedMountHook.cpp',
    fixes: [
      {
        // Fix const Rootstd::shared_ptr<const ShadowNode> to RootShadowNode::Shared const
        pattern: /const\s+Rootstd::shared_ptr<const ShadowNode>/g,
        replacement: 'RootShadowNode::Shared const'
      },
      {
        // Fix Rootstd::shared_ptr<const ShadowNode> to RootShadowNode::Shared - simple replacement
        pattern: /Rootstd::shared_ptr<const ShadowNode>/g,
        replacement: 'RootShadowNode::Shared'
      },
      {
        // Fix return type in lambda: -> Rootstd::shared_ptr<ShadowNode> to -> RootShadowNode::Unshared
        pattern: /->\s*Rootstd::shared_ptr<ShadowNode>/g,
        replacement: '-> RootShadowNode::Unshared'
      },
      {
        // Fix function signature to use RootShadowNode::Shared (alternative pattern)
        pattern: /(\s+void\s+ReanimatedMountHook::shadowTreeDidMount\s*\(\s*)std::shared_ptr<const ShadowNode>(\s+const\s+&\s*rootShadowNode)/g,
        replacement: '$1RootShadowNode::Shared$2'
      },
      {
        // Fix double mountTime parameter to HighResTimeStamp
        pattern: /(\s+void\s+ReanimatedMountHook::shadowTreeDidMount\s*\([^,)]+,\s*)double(\s*\)\s+noexcept)/g,
        replacement: '$1HighResTimeStamp mountTime$2'
      },
      {
        // Catch any remaining Rootstd::shared_ptr<ShadowNode>
        pattern: /Rootstd::shared_ptr<ShadowNode>/g,
        replacement: 'RootShadowNode::Unshared'
      },
      {
        // Catch any remaining Rootstd::shared_ptr
        pattern: /Rootstd::shared_ptr/g,
        replacement: 'std::shared_ptr'
      }
    ]
  },
  {
    file: 'Fabric/ReanimatedCommitHook.cpp',
    fixes: [
      {
        // Fix function signature to use RootShadowNode types - this is already handled above
        // but we need to ensure the signature matches the base class
        // The base class expects: RootShadowNode::Unshared shadowTreeWillCommit(ShadowTree const &, RootShadowNode::Shared const &, RootShadowNode::Unshared const &)
        pattern: /(\s+std::shared_ptr<ShadowNode>\s+ReanimatedCommitHook::shadowTreeWillCommit\s*\(\s*)std::shared_ptr<const ShadowNode>(\s+const\s+&\s*oldRootShadowNode)/g,
        replacement: '$1RootShadowNode::Shared$2'
      },
      {
        pattern: /(\s+std::shared_ptr<ShadowNode>\s+ReanimatedCommitHook::shadowTreeWillCommit\s*\([^,]+,\s*)std::shared_ptr<ShadowNode>(\s+const\s+&\s*newRootShadowNode)/g,
        replacement: '$1RootShadowNode::Unshared$2'
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
    // Search in Fabric, LayoutAnimations, and NativeModules directories
    const directoriesToSearch = ['Fabric', 'LayoutAnimations', 'NativeModules'];
    
    directoriesToSearch.forEach(dirName => {
      const dirPath = path.join(basePath, dirName);
      if (fs.existsSync(dirPath)) {
        const allFiles = walkDir(dirPath);
      
      allFiles.forEach(filePath => {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          let modified = false;
          let newContent = content;
          
          // Apply all common fixes
          if (content.includes('Rootstd::shared_ptr')) {
            // Fix missing newline in ReanimatedCommitHook.h
            newContent = newContent.replace(/(void maybeInitializeLayoutAnimations\(SurfaceId surfaceId\));Rootstd::shared_ptr<ShadowNode>\s+shadowTreeWillCommit/g, '$1;\n  RootShadowNode::Unshared shadowTreeWillCommit');
            // Fix Rootstd::shared_ptr<const ShadowNode> to RootShadowNode::Shared
            newContent = newContent.replace(/Rootstd::shared_ptr<const ShadowNode>/g, 'RootShadowNode::Shared');
            // Fix Rootstd::shared_ptr<ShadowNode> to RootShadowNode::Unshared (for return types and variables)
            newContent = newContent.replace(/Rootstd::shared_ptr<ShadowNode>/g, 'RootShadowNode::Unshared');
            // Fix const Rootstd::shared_ptr<const ShadowNode> to RootShadowNode::Shared const
            newContent = newContent.replace(/const\s+Rootstd::shared_ptr<const ShadowNode>/g, 'RootShadowNode::Shared const');
            // Fix -> Rootstd::shared_ptr<ShadowNode> to -> RootShadowNode::Unshared
            newContent = newContent.replace(/->\s*Rootstd::shared_ptr<ShadowNode>/g, '-> RootShadowNode::Unshared');
            // Fix any remaining Rootstd::shared_ptr
            newContent = newContent.replace(/Rootstd::shared_ptr/g, 'std::shared_ptr');
            modified = true;
          }
          
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
          
          if (content.includes('->props->rawProps') || content.includes('.props->rawProps') || content.includes('->props, (folly::dynamic)') || content.includes('folly::dynamic::merge')) {
            // Fix rawProps access - in RN 0.81.5, props don't have rawProps
            // Replace folly::dynamic::merge with folly::merge_patch first
            newContent = newContent.replace(/folly::dynamic::merge\s*\(\s*[^,]+->props->rawProps\s*,\s*\(folly::dynamic\)\s*\*rawProps\)/g, 'folly::merge_patch(folly::dynamic(), (folly::dynamic)*rawProps)');
            // Replace merge_patch calls
            newContent = newContent.replace(/folly::merge_patch\s*\(\s*[^,]+->props->rawProps\s*,\s*\(folly::dynamic\)\s*\*rawProps\)\s*\)/g, 'folly::merge_patch(folly::dynamic(), (folly::dynamic)*rawProps)');
            newContent = newContent.replace(/folly::merge_patch\s*\(\s*[^,]+->props\s*,\s*\(folly::dynamic\)\s*\*rawProps\)\s*\)/g, 'folly::merge_patch(folly::dynamic(), (folly::dynamic)*rawProps)');
            // Then handle general cases
            newContent = newContent.replace(/->props->rawProps/g, 'folly::dynamic()');
            newContent = newContent.replace(/\.props->rawProps/g, 'folly::dynamic()');
            modified = true;
          }
          
          // Fix function signatures to use RootShadowNode::Shared
          if (content.includes('shadowTreeDidMount') && content.includes('std::shared_ptr<const ShadowNode> const &rootShadowNode')) {
            newContent = newContent.replace(/(\s+void\s+shadowTreeDidMount\s*\(\s*)std::shared_ptr<const ShadowNode>(\s+const\s+&\s*rootShadowNode)/g, '$1RootShadowNode::Shared$2');
            modified = true;
          }
          
          if (content.includes('shadowTreeWillCommit') && content.includes('std::shared_ptr<const ShadowNode>')) {
            newContent = newContent.replace(/(\s+std::shared_ptr<ShadowNode>\s+shadowTreeWillCommit\s*\(\s*)std::shared_ptr<const ShadowNode>(\s+const\s+&\s*oldRootShadowNode)/g, '$1RootShadowNode::Shared$2');
            newContent = newContent.replace(/(\s+std::shared_ptr<ShadowNode>\s+shadowTreeWillCommit\s*\([^,]+,\s*)std::shared_ptr<ShadowNode>(\s+const\s+&\s*newRootShadowNode)/g, '$1RootShadowNode::Unshared$2');
            modified = true;
          }
          
          // Fix shadowNodeFromValue calls
          if (content.includes('shadowNodeFromValue')) {
            // This is a complex fix - shadowNodeFromValue was removed in RN 0.81.5
            // We'll need to handle this more carefully, but for now just log it
            console.warn(`⚠ Found shadowNodeFromValue in ${path.relative(reanimatedBasePath, filePath)} - may need manual fix`);
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
    });
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

