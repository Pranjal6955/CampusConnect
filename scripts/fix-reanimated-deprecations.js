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

// Files that need deprecation fixes
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
    file: 'Fabric/PropsRegistry.cpp',
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
        pattern: /Rootstd::shared_ptr<const ShadowNode>/g,
        replacement: 'RootShadowNode::Shared'
      },
      {
        pattern: /std::shared_ptr<const RootShadowNode>/g,
        replacement: 'RootShadowNode::Shared'
      },
      {
        pattern: /double\s+mountTime/g,
        replacement: 'HighResTimeStamp mountTime'
      }
    ]
  },
  {
    file: 'Fabric/ReanimatedMountHook.cpp',
    fixes: [
      {
        pattern: /Rootstd::shared_ptr<const ShadowNode>/g,
        replacement: 'RootShadowNode::Shared'
      },
      {
        pattern: /std::shared_ptr<const RootShadowNode>/g,
        replacement: 'RootShadowNode::Shared'
      },
      {
        pattern: /Rootstd::shared_ptr<ShadowNode>/g,
        replacement: 'RootShadowNode::Unshared'
      },
      {
        pattern: /std::shared_ptr<RootShadowNode>/g,
        replacement: 'RootShadowNode::Unshared'
      },
      {
        pattern: /double\s+mountTime/g,
        replacement: 'HighResTimeStamp mountTime'
      }
    ]
  },
  {
    file: 'Fabric/ShadowTreeCloner.h',
    fixes: [
      {
        pattern: /Rootstd::shared_ptr<ShadowNode>/g,
        replacement: 'std::shared_ptr<RootShadowNode>'
      }
    ]
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
  }
];

function fixFile(filePath, fixes, fileName) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const fix of fixes) {
      const beforeContent = content;
      // Use global replace
      const globalPattern = fix.pattern.global ? fix.pattern : new RegExp(fix.pattern.source, fix.pattern.flags + 'g');
      content = content.replace(globalPattern, fix.replacement);
      if (content !== beforeContent) {
        modified = true;
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
    if (fixFile(filePath, fileConfig.fixes, fileConfig.file)) {
      fixedCount++;
    }
  }
  
  // Also scan for any other files with deprecated types
  console.log('Scanning for additional files with deprecated types...');
  const allCppFiles = [];
  function findAllCppFiles(dir) {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          findAllCppFiles(filePath);
        } else if (file.endsWith('.cpp') || file.endsWith('.h') || file.endsWith('.hpp')) {
          allCppFiles.push(filePath);
        }
      });
    } catch (error) {
      // Ignore errors
    }
  }
  
  try {
    findAllCppFiles(reanimatedBasePath);
    allCppFiles.forEach(filePath => {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        const originalContent = content;
        
        // Fix deprecated types
        if (content.includes('ShadowNode::Shared')) {
          content = content.replace(/ShadowNode::Shared/g, 'std::shared_ptr<const ShadowNode>');
          modified = true;
        }
        
        if (content.includes('ShadowNode::Unshared')) {
          content = content.replace(/ShadowNode::Unshared/g, 'std::shared_ptr<ShadowNode>');
          modified = true;
        }
        
        if (content.includes('ShadowNode::ListOfShared')) {
          content = content.replace(/ShadowNode::ListOfShared/g, 'std::vector<std::shared_ptr<const ShadowNode>>');
          modified = true;
        }
        
        // Fix RootShadowNode types - use type aliases instead of direct std::shared_ptr
        if (content.includes('std::shared_ptr<const RootShadowNode>')) {
          content = content.replace(/std::shared_ptr<const RootShadowNode>/g, 'RootShadowNode::Shared');
          modified = true;
        }
        
        if (content.includes('std::shared_ptr<RootShadowNode>')) {
          content = content.replace(/std::shared_ptr<RootShadowNode>/g, 'RootShadowNode::Unshared');
          modified = true;
        }
        
        if (content.includes('Rootstd::shared_ptr')) {
          content = content.replace(/Rootstd::shared_ptr<const ShadowNode>/g, 'RootShadowNode::Shared');
          content = content.replace(/Rootstd::shared_ptr<ShadowNode>/g, 'RootShadowNode::Unshared');
          modified = true;
        }
        
        // Fix props->rawProps - In RN 0.81.5, Props no longer has rawProps member directly
        // The error shows: layoutAnimation.finalView->props->rawProps
        // We need to construct RawProps from the props differently
        if (content.includes('->props->rawProps') || content.includes('props->rawProps')) {
          // Replace props->rawProps with a RawProps constructed from the props
          // This is context-dependent and may need adjustment
          content = content.replace(
            /([a-zA-Z_][a-zA-Z0-9_]*)->props->rawProps/g,
            'RawProps((folly::dynamic)*$1->props)'
          );
          content = content.replace(
            /props->rawProps/g,
            'RawProps((folly::dynamic)*props)'
          );
          modified = true;
        }
        
        // Fix shadowNodeFromValue - this function was removed in RN 0.81.5
        // It's been replaced with shadowNodeListFromValue which returns ShadowNode::UnsharedListOfShared
        // We need to extract the first element from the list
        if (content.includes('shadowNodeFromValue(') && !content.includes('// FIXED: shadowNodeFromValue')) {
          // shadowNodeListFromValue returns shared_ptr<vector<shared_ptr<const ShadowNode>>>
          // We need to get the first element: (*shadowNodeListFromValue(...))->at(0)
          content = content.replace(
            /shadowNodeFromValue\(([^,]+),\s*([^)]+)\)/g,
            '(*shadowNodeListFromValue($1, $2))->at(0)'
          );
          modified = true;
          console.log(`⚠ Fixed shadowNodeFromValue in ${path.relative(reanimatedBasePath, filePath)} - verify this is correct`);
        }
        
        if (content.includes('double mountTime') && !content.includes('HighResTimeStamp mountTime')) {
          content = content.replace(/double\s+mountTime/g, 'HighResTimeStamp mountTime');
          modified = true;
        }
        
        if (modified && content !== originalContent) {
          fs.writeFileSync(filePath, content, 'utf8');
        }
      } catch (error) {
        // Skip files that can't be read/written
      }
    });
  } catch (error) {
    // Ignore errors
  }
  
  if (fixedCount > 0) {
    console.log(`\n✓ Total: Fixed ${fixedCount} file(s)`);
  } else {
    console.log('✓ All files already fixed or up-to-date');
  }
} else {
  console.log('⚠ react-native-reanimated not found, skipping fix (this is normal if the package is not installed yet)');
}

