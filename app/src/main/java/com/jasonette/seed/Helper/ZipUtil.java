package com.jasonette.seed.Helper;

import android.os.Build;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;

// import com.google.android.gms.common.util.IOUtils;

import java.io.*;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.*;
import java.util.Enumeration;
// import java.util.Date;

/**
 * ZipUtil is a program to provide simple zip operations such as creating a zip of a folder
 * or extracting a zip to a folder. This program utilizes the {@link java.util.zip.ZipFile} classes
 * to implement these functions.
 * <p>
 * As part of the creation of the zip the files are compressed to the default level of compression
 * and stored with the representative CRC. Also the time the file was last modified is preserved too.
 *
 * @author Jonathan Kelley
 * @version 1.0
 */
public class ZipUtil {
    /**
     * OK constant for ZipUtil class
     */
    private final static int ZIPUTIL_OK = 0;
    /**
     * Error constant for ZipUtil class
     */
    private final static int ZIPUTIL_ERROR = -1;
    /**
     * Constant for ZipUtil Create command
     */
    private final static int ZIPUTIL_CREATE = 0;
    /**
     * Constant for ZipUtil extract command
     */
    private final static int ZIPUTIL_EXTRACT = 1;

    private final static int ZIPUTIL_EXTRACT_MAIN_FILES_AND_FILE_HEADERS = 2;
    private final static int ZIPUTIL_GET_FILE_HEADERS = 3;

    /**
     * Constant for ZipUtil max buffer size
     */
    private final static int MAX_BUF_SIZE = 2048;
    /**
     * Constant for file separator regardless of OS
     **/
    private final static String FILESEP = "/";

    /**
     * Global counter for create or extract function
     */
    private static int numprocfiles;

    /**
     * Validates arguments to be suitable for the rest of the program
     *
     * @param args Arguments to the program
     * @return int Command type to be run i.e create, or extract. In error returns ZIPUTIL_ERROR
     */
    public static int checkArgs(String[] args) {

        int retcode = ZIPUTIL_ERROR;
        
        /*
            Currently we only accept 3 arguments and the first argument must be create or extract 
            Failure results in usage being printed
        */
        switch (args.length) {
            case 3:
                /* Find out which function we are running */
                if (args[0].equals("create")) {
                    retcode = ZIPUTIL_CREATE;
                } else if (args[0].equals("extract")) {
                    retcode = ZIPUTIL_EXTRACT;
                } else if (args[0].equals("extract_main_files_and_file_headers")) {
                    retcode = ZIPUTIL_EXTRACT_MAIN_FILES_AND_FILE_HEADERS;
                } else if (args[0].equals("ziputil_get_file_headers")) {
                    retcode = ZIPUTIL_GET_FILE_HEADERS;
                } else {
                    printError("Incorrect command specified: " + args[0]);
                    printUsage();
                }
                break;
            default:
                printUsage();
                break;
        }
        return retcode;
    }

    /**
     * Prints usage for the ZipUtil program
     */
    public static void printUsage() {
        System.out.println();
        System.out.println("ZipUtil: Usage");
        System.out.println("\t To extract a zip file specify the filename of the *existing* zip file first, and then the path for where to extract the zip.");
        System.out.println("\t   For example: java ZipUtil extract <zip file to extract> <path to extract to>\n");
        System.out.println("\t To create a zip file enter the filename of the *new* zip file to create first, and then the path to the files you want to zip.");
        System.out.println("\t   For example: java ZipUtil create <zip file to create> <path to file to zip>");
        System.out.println();
    }

    /**
     * Prints errors for the ZipUtil program
     *
     * @param error string to print out
     */
    public static void printError(String error) {
        System.out.println();
        System.out.println("ZipUtil: Error");
        System.out.println(error);
        System.out.println();
    }

    /**
     * Prints messages for the ZipUtil program
     *
     * @param msg string to print out
     */
    public static void printMsg(String msg) {
        System.out.println(msg);
    }

    /**
     * Checks whether file/directories exist
     *
     * @param path String path to check
     * @return boolean whether the path exists (true) or not (false)
     */
    public static boolean checkPath(String path) {
        return (new File(path)).exists();
    }

    /**
     * Compresses files and adds it to zipfile
     *
     * @param zipout  ZipOutputStream object which is opened and closed in createZip
     * @param curpath String to specify what the current local path is while walking the directory tree. Not an absolute path.
     * @param file    File object which represents file to compress and zip
     * @return int Flag for determining success (0) versus failure (ZIPUTIL_ERROR)
     */
    public static int compressFile(ZipOutputStream zipout, String curpath, File file) {
        int bytesread = 0;
        byte tmpbuffer[] = new byte[MAX_BUF_SIZE];
        int retcode = 0;

        String localfilepath = curpath + file.getName();
        try {
            CheckedInputStream cis = new CheckedInputStream(new FileInputStream(file.toString()), new CRC32());
            BufferedInputStream bis = new BufferedInputStream(cis);
            ZipEntry zipentry = new ZipEntry(localfilepath);
            
            /*
              Set the method to deflated (compressed)
              Set the entries lastModTime to preserve it on extract
            */
            zipentry.setMethod(ZipEntry.DEFLATED);
            zipentry.setTime(file.lastModified());
            zipout.putNextEntry(zipentry);

            /* Read the whole file from the disk and write it to the zipentry keeping a CRC check */
            while ((bytesread = bis.read(tmpbuffer, 0, tmpbuffer.length)) != -1) {
                zipout.write(tmpbuffer, 0, bytesread);
            }
            cis.close();
            bis.close();

            /* Set the crc to the calculated value on the buffer stream */
            zipentry.setCrc(cis.getChecksum().getValue());
            zipout.closeEntry();
        } catch (IOException e) {
            printError(e.toString());
            retcode = ZIPUTIL_ERROR;
        }
        return retcode;
    }

    /**
     * Walks directory tree recursively compressing files and adding it to zipfile
     *
     * @param dir     Directory object which is used to retrieve file list and subdirectories
     * @param zipout  ZipOutputStream object which is opened and closed in createZip
     * @param curpath String to specify what the current local path is while walking the directory tree. Not an absolute path.
     * @return int Flag for determining success (0) versus failure (ZIPUTIL_ERROR)
     */
    public static int walkTree(File dir, ZipOutputStream zipout, String curpath) {
        
        /*
           Get the list of files and create a buffer to do the file io
        */
        File filelist[] = dir.listFiles();
        byte tmpbuffer[] = new byte[MAX_BUF_SIZE];
        int retcode = 0;

        try {   
            /*
                iterate through the list of files
                    for directories we add the directory entry and recurse down
                    for files we add the file entry, read the file, and write the compressed form
            */
            for (int i = 0; i < filelist.length; i++) {
                if (filelist[i].isDirectory()) {
                    String dirname = curpath + filelist[i].getName() + FILESEP;
                    printMsg(" Adding: " + dirname);
                    zipout.putNextEntry(new ZipEntry(dirname));
                    zipout.closeEntry();
                    if ((retcode = walkTree(filelist[i], zipout, dirname)) != 0) {
                        return retcode;
                    }
                } else {
                    String filename = curpath + filelist[i].getName();
                    printMsg(" Adding: " + filename);
                    if ((retcode = compressFile(zipout, curpath, filelist[i])) != 0) {
                        return retcode;
                    }
                    numprocfiles++;
                }

            } // end for each file in filelist
        } catch (IOException e) {
            printError(e.toString());
            retcode = ZIPUTIL_ERROR;
        }
        return retcode;
    }

    /**
     * Creates zipfile of inputpath and outputs compressed files into zipfile
     *
     * @param zipfile   String value of the zipfile name passed in by user
     * @param inputpath String value of the location of the files/directories to add to zip
     * @return int Flag for determining success (0) versus failure (ZIPUTIL_ERROR)
     */
    public static int createZip(String zipfile, String inputpath) {
        int retcode = 0;
        File root = new File(inputpath);
        /*
            Handle two cases
            - The user passes a directory as for what to zip
            - The user passes a file to zip with no directories
        */
        try {

            // Open a ZipOutputStream to the zipfile and set the method to deflated for compression
            ZipOutputStream zipout = new ZipOutputStream(new FileOutputStream(zipfile));
            zipout.setMethod(ZipOutputStream.DEFLATED);

            if (root.isDirectory()) {
                zipout.putNextEntry(new ZipEntry(root.getName() + FILESEP));
                zipout.closeEntry();
                printMsg(" Adding: " + root.getName() + FILESEP);
                retcode = walkTree(root, zipout, root.getName() + FILESEP);
            } else {
                // single file....just zip this file
                retcode = compressFile(zipout, "", root);
                printMsg(" Adding: " + root.getName() + FILESEP);
                numprocfiles++;
            }
            zipout.close();
        } catch (IOException e) {
            printError(e.toString());
            retcode = ZIPUTIL_ERROR;
        }
        return retcode;
    }

    static void deleteRecursive(File fileOrDirectory) {
        if (fileOrDirectory.isDirectory())
            for (File child : fileOrDirectory.listFiles())
                deleteRecursive(child);

        fileOrDirectory.delete();
    }

    @RequiresApi(api = Build.VERSION_CODES.N)
    public static boolean stringContainsItemFromList(String inputStr, String[] items) {
        return Arrays.stream(items).anyMatch(inputStr::contains);
    }

    public static int getZip_FileHeaders(String zipfile, Map<String, Zipinfo_header> zipFileInfoFiles) {
        int retcode = 0;
        try {
            ZipFile zip = new ZipFile(zipfile);
            Enumeration<? extends ZipEntry> items = zip.entries();

            // https://stackoverflow.com/questions/7046951/how-can-i-find-the-file-offset-of-a-zipfile-entry-in-java
            long offsetInZipFile = 0;

            /*
                iterate through the zipfile
            */
            while (items.hasMoreElements()) {
                ZipEntry zipentry = items.nextElement();
                printMsg("Extracting header for: " + zipentry.getName());

                // get header
                long zipentryFileDataSize = 0;
                long zipentryExtraFieldSize = zipentry.getExtra() == null ? 0 : zipentry.getExtra().length;

                int NUM_FIXED_BYTES_IN_ZIPENTRY_HEADER = 30;
                long zipentryHeaderSize = NUM_FIXED_BYTES_IN_ZIPENTRY_HEADER + zipentry.getName().length() + zipentryExtraFieldSize;

                if (!zipentry.isDirectory()) {
                    zipentryFileDataSize = zipentry.getCompressedSize();

                    // create header structure
                    String zipentryFilename = zipentry.getName();
                    Zipinfo_header zipinfo_header = new Zipinfo_header(offsetInZipFile, zipentryHeaderSize, zipentryFileDataSize, zipentryFilename);
                    // printMsg(zipinfo_header.toString());

                    zipFileInfoFiles.put(zipentryFilename, zipinfo_header);
                    System.out.println(zipFileInfoFiles.get(zipentryFilename));
                    numprocfiles++;
                }
                offsetInZipFile += (zipentryHeaderSize + zipentryFileDataSize);

            } // end while hasMoreElements
            zip.close();
            System.out.println(zipFileInfoFiles);

        } catch (IOException e) {
            printError(e.toString());
            retcode = ZIPUTIL_ERROR;
        }
        return retcode;
    }

    @RequiresApi(api = Build.VERSION_CODES.N)
    public static int extractZip_mainFilesAndFileHeaders(String zipfile, String outputpath) {
        int retcode = 0;

        try {
            ZipFile zip = new ZipFile(zipfile);
            Enumeration<? extends ZipEntry> items = zip.entries();

            // https://stackoverflow.com/questions/7046951/how-can-i-find-the-file-offset-of-a-zipfile-entry-in-java
            long offsetInZipFile = 0;

            /*
                iterate through the zipfile
                - for directories create the necessary directory structure
                - for files read the compressed data and write to the specified file
            */
            while (items.hasMoreElements()) {
                ZipEntry zipentry = items.nextElement();
                printMsg("Extracting header for: " + zipentry.getName());

                String filepath = outputpath + FILESEP + zipentry.getName();

                String relativeFilepath = zipentry.getName();

                // get header
                long zipentryFileDataSize = 0;
                long zipentryExtraFieldSize = zipentry.getExtra() == null ? 0 : zipentry.getExtra().length;

                int NUM_FIXED_BYTES_IN_ZIPENTRY_HEADER = 30;
                long zipentryHeaderSize = NUM_FIXED_BYTES_IN_ZIPENTRY_HEADER + zipentry.getName().length() + zipentryExtraFieldSize;

                if (!zipentry.isDirectory()) {
                    zipentryFileDataSize = zipentry.getCompressedSize();

                    // create header structure
                    Zipinfo_header zipinfo_header = new Zipinfo_header(offsetInZipFile, zipentryHeaderSize, zipentryFileDataSize, zipentry.getName());
                    printMsg(zipinfo_header.toString());

                    String[] zipfilesToExtractData = {
                            "json",
                            "structure"
                    };
                    boolean doExtractZipData = stringContainsItemFromList(relativeFilepath, zipfilesToExtractData);

                    if (doExtractZipData) {

                        printMsg("Extracting data for: " + zipentry.getName());
                        if (create_dir_if_needed(filepath, zipentry) == ZIPUTIL_ERROR) {
                            return ZIPUTIL_ERROR;
                        }

                        if (extractZipEntryData(zip, filepath, zipentry) == ZIPUTIL_ERROR) {
                            printError("Failed to extractZipEntryData for: " + filepath);
                            return ZIPUTIL_ERROR;
                        }
                    }

                    numprocfiles++;
                }
                offsetInZipFile += (zipentryHeaderSize + zipentryFileDataSize);

            } // end while hasMoreElements
            zip.close();

        } catch (IOException e) {
            printError(e.toString());
            retcode = ZIPUTIL_ERROR;
        }
        return retcode;
    }

    // my class
    public static class Zipinfo_header {
        // public member variable
        public long offsetInZipFile;
        public long headerSize;
        public long compressedSize;
        public String filename;

        // default constructor
        public Zipinfo_header(long otherOffsetInZipFile, long otherHeaderSize, long otherCompressedSize, String otherFilename) {
            offsetInZipFile = otherOffsetInZipFile;
            headerSize = otherHeaderSize;
            compressedSize = otherCompressedSize;
            filename = otherFilename;
        }

        @Override
        public String toString() {
            return new StringBuilder()
                    .append("{Zipinfo_header:")
                    .append(" offsetInZipFile=").append(offsetInZipFile)
                    .append(", headerSize=").append(headerSize)
                    .append(", compressedSize=").append(compressedSize)
                    .append(", filename=").append(filename)
                    .append("}")
                    .toString();
        }
    }

    public static byte[] extractZipEntryData_toArrayBuffer(String dirPath1, int sliceBeg, int numBytesToRead, byte[] byteArray) throws Exception {
        // int retcode = 0;
        try {
            InputStream inputStream = new FileInputStream(dirPath1);
            BufferedInputStream bis = new BufferedInputStream(inputStream);
            // bis.skip(sliceBeg);
            byteArray = JasonHelper.readBytes(bis, sliceBeg, numBytesToRead);
            bis.close();
        } catch (IOException e) {
            printError(e.toString());
            throw new Exception("Exception message");
            // retcode = ZIPUTIL_ERROR;
        }
        return byteArray;

    }

    public static int extractZipEntryData(@NonNull ZipFile zip, String filepath, ZipEntry zipentry) {
        int retcode = 0;
        try {
            int bytesread = 0;
            byte tmpbuffer[] = new byte[MAX_BUF_SIZE];

            CheckedOutputStream cos = new CheckedOutputStream(new FileOutputStream(filepath), new CRC32());
            BufferedOutputStream bos = new BufferedOutputStream(cos);
            BufferedInputStream bis = new BufferedInputStream(zip.getInputStream(zipentry));

            /* Read the whole file from the zip entry and write it to stored file name keeping a CRC check */
            while ((bytesread = bis.read(tmpbuffer, 0, tmpbuffer.length)) != -1) {
                bos.write(tmpbuffer, 0, bytesread);
            }
            bis.close();
            bos.flush();
            bos.close();

            /* Set the last modified time of the unzipped file to the saved time in the zip */
            File f = new File(filepath);
            f.setLastModified(zipentry.getTime());

            final boolean checksumOk = (zipentry.getCrc() == cos.getChecksum().getValue());
            printMsg(" Extracting: " + zipentry.getName() + (checksumOk ? "...OK!" : "....checksum invalid!"));

            if (!checksumOk) {
                retcode = ZIPUTIL_ERROR;
            }
        } catch (IOException e) {
            printError(e.toString());
            retcode = ZIPUTIL_ERROR;
        }
        return retcode;
    }

    public static int create_dir_if_needed(String filepath, ZipEntry zipentry) {
        String filedir = "";
        if (zipentry.isDirectory() == false) {
            filedir = filepath.substring(0, filepath.lastIndexOf("/") + 1);
        }
        File directory = new File(filedir);
        if (!directory.exists()) {
            printMsg(" Creating directory for: " + filedir);
            boolean success = directory.mkdirs();
            if (!success) {
                printError("Failed to make directory structure for " + directory);
                return ZIPUTIL_ERROR;
            }
        }
        return ZIPUTIL_OK;
    }

    /**
     * Extracts zipfile to specified outputpath
     *
     * @param zipfile    String value of the zipfile name passed in by user
     * @param outputpath String value of the location of the directory to unzip the files into
     * @return int Flag for determining success (0) versus failure (ZIPUTIL_ERROR)
     */
    public static int extractZip(String zipfile, String outputpath) {
        int retcode = 0;

        try {
            ZipFile zip = new ZipFile(zipfile);
            Enumeration<? extends ZipEntry> items = zip.entries();

            /*
                iterate through the zipfile
                - for directories create the necessary directory structure
                - for files read the compressed data and write to the specified file
            */
            while (items.hasMoreElements()) {
                ZipEntry zipentry = items.nextElement();
                String filepath = outputpath + FILESEP + zipentry.getName();

                if (create_dir_if_needed(filepath, zipentry) == ZIPUTIL_ERROR) {
                    return ZIPUTIL_ERROR;
                }

                if (zipentry.isDirectory() == false) {

                    if (extractZipEntryData(zip, filepath, zipentry) == ZIPUTIL_ERROR) {
                        printError("Failed to extractZipEntryData for: " + filepath);
                        return ZIPUTIL_ERROR;
                    }

                    numprocfiles++;
                } //end else

            } // end while hasMoreElements
            zip.close();

        } catch (IOException e) {
            printError(e.toString());
            retcode = ZIPUTIL_ERROR;
        }
        return retcode;
    }

    /**
     * Processes zip command and validates input arguments for each command
     *
     * @param operation   Int flag to indicate specified command. Currently only create or extract
     * @param zipfile     String value of the zipfile name passed in by user to be created or extracted from
     * @param contentpath String value of the location of the directory to either zip files from or unzip the files into
     * @return int Flag for determining success (0) versus failure (ZIPUTIL_ERROR)
     */
    @RequiresApi(api = Build.VERSION_CODES.N)
    public static int processZipCmd(int operation, String zipfile, String contentpath) {
        int retcode = 0;
        
        /*
            switch on the possible zip operations....currently only create and extract
            - for create make sure the zipfile doesn't exist but the directory|file does
            - for extract make sure the zipfile exists but the directory/file does not
        */
        switch (operation) {
            case ZIPUTIL_CREATE:
                /* check to see if zip already exists */
                if (checkPath(zipfile) == false) {
                    /* check to see if content path is valid */
                    if (checkPath(contentpath) == true) {
                        /* build zip */
                        printMsg("Building " + zipfile + " from " + contentpath);
                        retcode = createZip(zipfile, contentpath);
                    } else {
                        /* content does not exist */
                        printError("The source folder you attempted to create the zip from does not exist: " + contentpath + ". Please check your path is correct.");
                        retcode = ZIPUTIL_ERROR;
                    }
                } else {
                    /* zip file already exists */
                    printError("The zip file you attempted to create already exists: " + zipfile + ". Please check the filename is correct.");
                    retcode = ZIPUTIL_ERROR;
                }
                break;
            case ZIPUTIL_EXTRACT:
            case ZIPUTIL_EXTRACT_MAIN_FILES_AND_FILE_HEADERS:
                /* check to see if zip path exists */
                if (checkPath(zipfile) == true) {

                    // delete all contents of contentpath
                    deleteRecursive(new File(contentpath));

                    /* check to see if content path already exists */
                    if (checkPath(contentpath) == false) {
                        /* extract the zip */
                        boolean success = (new File(contentpath)).mkdir();
                        if (!success) {
                            printError("Failed to make directory structure for " + contentpath);
                            return ZIPUTIL_ERROR;
                        }

                        if (operation == ZIPUTIL_EXTRACT) {
                            printMsg("Extracting " + zipfile + " to " + contentpath);
                            retcode = extractZip(zipfile, contentpath);
                        } else if (operation == ZIPUTIL_EXTRACT_MAIN_FILES_AND_FILE_HEADERS) {
                            printMsg("Extracting " + zipfile + " to " + contentpath);
                            retcode = extractZip_mainFilesAndFileHeaders(zipfile, contentpath);
                        }

                    } else {
                        /* content already exists...inform the user*/
                        printError("The destination folder you attempted to extract to already exists: " + contentpath + ". Please specify a different destination.");
                        retcode = ZIPUTIL_ERROR;
                    }
                } else {
                    /* zip file doesn't exist...inform the user*/
                    printError("The zip file you attempted to extract does not exist: " + zipfile + ". Please check the filename is correct.");
                    retcode = ZIPUTIL_ERROR;
                }

                break;

            case ZIPUTIL_GET_FILE_HEADERS:
                /* check to see if zip path exists */
                if (checkPath(zipfile) == true) {
                    printMsg("Get headers from: " + zipfile);
                    Map<String, Zipinfo_header> zipFileInfoFiles = new HashMap<String, Zipinfo_header>();
                    retcode = getZip_FileHeaders(zipfile, zipFileInfoFiles);

                } else {
                    /* zip file doesn't exist...inform the user*/
                    printError("The zip file you attempted to extract does not exist: " + zipfile + ". Please check the filename is correct.");
                    retcode = ZIPUTIL_ERROR;
                }
                break;

            default:
                /* In case more commands are added */
                break;
        }

        return retcode;
    }

    /**
     * Program entry function.
     *
     * @param args String array of arguments to the program
     */
    public static void main(String[] args) {

        int command = 0;
        int retcode = 0;

        /* check arguments */
        /* expecting to get back either a valid type */
        if ((command = checkArgs(args)) == ZIPUTIL_ERROR) {
            System.exit(ZIPUTIL_ERROR);
        } else {
            numprocfiles = 0;
            /* Run the zip command (create | extract) passing the additional two arguments */
            printMsg("ZipUtil - ");
            retcode = processZipCmd(command, args[1], args[2]);
            if (retcode == 0) {
                printMsg("- Completed. Processed " + numprocfiles + " files successfully.");
            } else {
                printMsg("- Completed with errors. Processed " + numprocfiles + "files.");
            }
            System.exit(retcode);
        }

    }

}